var BIRevenueOSService = (function () {
  'use strict';

  function money(n) {
    if (typeof App !== 'undefined' && App.fmtP) return '₪' + App.fmtP(n);
    return '₪' + String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function clamp(n) {
    return BIScoringEngine.clamp(n);
  }

  function safeNumber(n) {
    n = parseFloat(n);
    return isFinite(n) && !isNaN(n) ? n : 0;
  }

  function safeDiv(a, b) {
    a = safeNumber(a);
    b = safeNumber(b);
    return b === 0 ? 0 : a / b;
  }

  function orderDate(o) {
    var ms = BIDataLoader.orderTimestampMs(o);
    return ms ? new Date(ms) : null;
  }

  function sameLocalDay(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function ordersForDay(orders, date) {
    return orders.filter(function (o) {
      return sameLocalDay(orderDate(o), date);
    });
  }

  function aggregateDay(orders, date) {
    return BIMetricsEngine.aggregate(ordersForDay(orders, date));
  }

  function avgDailyOrders(orders, endMs, days) {
    var list = BIDataLoader.filterOrdersInRange(orders, {
      start: new Date(endMs - days * 864e5),
      end: new Date(endMs)
    });
    return safeDiv(list.length, days);
  }

  function avgOrderValue(summary) {
    return summary.orders > 0 ? safeDiv(summary.revenue, summary.orders) : 0;
  }

  function profitFromRevenue(revenue, summary) {
    if (summary.profitAvailable && summary.revenue > 0) return safeNumber(revenue) * safeDiv(summary.profit, summary.revenue);
    return 0;
  }

  function productUnitMargin(p) {
    if (!p.marginAvailable || p.margin === null || p.qty <= 0) return null;
    return safeDiv(p.margin, p.qty);
  }

  function confidence(ctx, rows, missing) {
    return BITrustEngine.metric(ctx.filtered.length, rows || 0, ctx.previous.length > 0, missing || []);
  }

  function opportunity(title, type, revenueGain, profitGain, urgency, confidenceObj, why, action) {
    revenueGain = safeNumber(revenueGain);
    profitGain = safeNumber(profitGain);
    return {
      title: title,
      type: type,
      estimatedRevenueGain: parseFloat(revenueGain.toFixed(2)),
      estimatedProfitGain: parseFloat(profitGain.toFixed(2)),
      urgency: clamp(urgency),
      confidence: confidenceObj,
      why: why,
      suggestedAction: action,
      score: 0
    };
  }

  function leak(title, type, monthlyLoss, urgency, confidenceObj, why, action) {
    monthlyLoss = Math.max(0, safeNumber(monthlyLoss));
    return {
      title: title,
      type: type,
      monthlyEstimatedLoss: parseFloat(monthlyLoss.toFixed(2)),
      urgency: clamp(urgency),
      confidence: confidenceObj,
      why: why,
      suggestedAction: action
    };
  }

  function actionRow(title, category, revenueImpact, profitImpact, maxRevenue, maxProfit, urgency, confidenceObj, why) {
    revenueImpact = Math.max(0, safeNumber(revenueImpact));
    profitImpact = Math.max(0, safeNumber(profitImpact));
    var revenueScore = clamp(safeDiv(revenueImpact, Math.max(1, maxRevenue)) * 100);
    var profitScore = clamp(safeDiv(profitImpact, Math.max(1, maxProfit)) * 100);
    var score = (revenueScore * 0.45) +
      (profitScore * 0.30) +
      (clamp(urgency) * 0.15) +
      ((confidenceObj.score || 0) * 0.10);
    return {
      title: title,
      category: category,
      revenueImpact: parseFloat(revenueImpact.toFixed(2)),
      profitImpact: parseFloat(profitImpact.toFixed(2)),
      urgency: clamp(urgency),
      confidence: confidenceObj,
      score: clamp(score),
      why: why,
      formula: 'Score = Revenue Impact 45% + Profit Impact 30% + Urgency 15% + Confidence 10%'
    };
  }

  function dailyRevenueCommandCenter(ctx, productModel, easyMoney, leaks) {
    var today = ctx.range.end;
    var lastWeek = new Date(today.getTime() - 7 * 864e5);
    var todaySummary = aggregateDay(ctx.orders, today);
    var lastWeekSummary = aggregateDay(ctx.orders, lastWeek);
    var expectedOrders = avgDailyOrders(ctx.orders, today.getTime(), 30);
    var expectedRevenue = expectedOrders * avgOrderValue(ctx.summary);
    var missingRevenue = Math.max(0, expectedRevenue - todaySummary.revenue);
    var profitTrend = todaySummary.profitAvailable && lastWeekSummary.profitAvailable
      ? BIMetricsEngine.pctChange(todaySummary.profit, lastWeekSummary.profit)
      : null;

    return {
      revenueToday: todaySummary.revenue,
      revenueVsSameWeekdayLastWeek: BIMetricsEngine.pctChange(todaySummary.revenue, lastWeekSummary.revenue),
      ordersToday: todaySummary.orders,
      expectedOrdersToday: parseFloat(expectedOrders.toFixed(1)),
      ordersVsExpectedPct: BIMetricsEngine.pctChange(todaySummary.orders, expectedOrders),
      profitTrendToday: profitTrend,
      missingRevenueEstimate: parseFloat(missingRevenue.toFixed(2)),
      topUrgentOpportunities: easyMoney.slice(0, 3),
      topUrgentRisks: leaks.slice(0, 3),
      confidence: confidence(ctx, todaySummary.orders + lastWeekSummary.orders, todaySummary.profitAvailable ? [] : ['רווח יומי דורש עלויות בכל פריטי ההזמנה']),
      formula: 'היום מול אותו יום בשבוע שעבר; הזמנות צפויות = ממוצע הזמנות יומי ב-30 יום; הכנסה חסרה = הזמנות צפויות × ממוצע הזמנה פחות הכנסה היום'
    };
  }

  function easyMoneyEngine(ctx, productModel, customerDna, inventoryWarRoom) {
    var rows = [];
    var avgOrder = avgOrderValue(ctx.summary);
    var avgMarginRate = ctx.summary.profitAvailable && ctx.summary.revenue > 0 ? safeDiv(ctx.summary.profit, ctx.summary.revenue) : 0;

    customerDna.groups.sleepingHighValue.rows.slice(0, 4).forEach(function (c) {
      rows.push(opportunity(
        'להחזיר לקוח VIP רדום: ' + c.name,
        'reactivate_vip',
        c.avgOrder || safeDiv(c.revenue, Math.max(1, c.orders)),
        profitFromRevenue(c.avgOrder || safeDiv(c.revenue, Math.max(1, c.orders)), ctx.summary),
        c.daysSince >= 90 ? 95 : 80,
        confidence(ctx, customerDna.customers.length, []),
        'לקוח בעל ערך היסטורי לא הזמין ' + c.daysSince + ' ימים',
        'בדיקת צורך להזמנה חוזרת - ללא שליחת הודעה אוטומטית'
      ));
    });

    customerDna.groups.growing.rows.slice(0, 4).forEach(function (c) {
      var gain = Math.max(avgOrder, c.avgOrder || 0) * 0.35;
      rows.push(opportunity(
        'Upsell ללקוח בצמיחה: ' + c.name,
        'upsell_growing_customer',
        gain,
        profitFromRevenue(gain, ctx.summary),
        70,
        confidence(ctx, customerDna.customers.length, []),
        'הלקוח הגדיל קניות מול התקופה הקודמת',
        'להציע סל משלים ידנית לפי המוצרים שכבר רוכש'
      ));
    });

    inventoryWarRoom.highVelocity.slice(0, 4).forEach(function (p) {
      var gain = p.dailySales * safeDiv(p.revenue, Math.max(1, p.qty)) * 7;
      rows.push(opportunity(
        'מוצר חם שצריך תשומת לב: ' + p.name,
        'hot_product_attention',
        gain,
        profitFromRevenue(gain, ctx.summary),
        p.stockDays !== null && p.stockDays <= 14 ? 90 : 65,
        confidence(ctx, productModel.products.length, p.stock === null ? ['אין מלאי עדכני בפריט הזמנה'] : []),
        'קצב מכירה יומי גבוה. אם המלאי נמוך, הכנסה עלולה להיעצר',
        'בדיקת זמינות/רכש ידנית'
      ));
    });

    productModel.products.filter(function (p) {
      return p.qty > 0 && p.categoryAvgPrice > 0 && p.avgPrice < p.categoryAvgPrice * 0.92;
    }).sort(function (a, b) {
      return ((b.categoryAvgPrice - b.avgPrice) * b.qty) - ((a.categoryAvgPrice - a.avgPrice) * a.qty);
    }).slice(0, 4).forEach(function (p) {
      var gain = (p.categoryAvgPrice - p.avgPrice) * p.qty * 0.4;
      rows.push(opportunity(
        'אפסייד מחיר במוצר: ' + p.name,
        'margin_upside',
        gain,
        p.marginAvailable ? gain : profitFromRevenue(gain, ctx.summary),
        62,
        confidence(ctx, productModel.products.length, []),
        'מחיר ממוצע נמוך מממוצע קטגוריה בהזמנות בפועל',
        'בדיקת מחיר ידנית בלבד - אין שינוי מחיר אוטומטי'
      ));
    });

    inventoryWarRoom.deadStock.slice(0, 4).forEach(function (p) {
      var unlock = p.tiedCapital !== null ? p.tiedCapital * 0.15 : safeNumber(p.revenue) * 0.2;
      rows.push(opportunity(
        'לשחרר מלאי איטי בבאנדל: ' + p.name,
        'dead_stock_bundle',
        unlock,
        Math.max(0, unlock * Math.max(avgMarginRate, 0.08)),
        55,
        confidence(ctx, productModel.products.length, p.tiedCapital === null ? ['חסרה עלות לחישוב הון קשור'] : []),
        'מלאי קיים עם ביקוש חלש יוצר נעילת הון',
        'לבחון באנדל ידני עם מוצר מהיר'
      ));
    });

    rows.forEach(function (r) {
      r.score = clamp((safeDiv(r.estimatedRevenueGain, Math.max(1, ctx.summary.revenue)) * 100 * 0.5) + (r.urgency * 0.3) + ((r.confidence.score || 0) * 0.2));
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    return rows.slice(0, 12);
  }

  function moneyLeakEnginePro(ctx, productModel, customerDna, inventoryWarRoom, profitLeak) {
    var rows = [];
    var periodDays = Math.max(1, Math.ceil((ctx.range.end.getTime() - ctx.range.start.getTime()) / 864e5));
    var monthlyFactor = 30 / periodDays;

    profitLeak.leaks.forEach(function (l) {
      rows.push(leak(
        l.title,
        l.type,
        Math.abs(l.impact || 0) * monthlyFactor,
        l.type === 'low_margin_product' || l.type === 'hidden_loss_pattern' ? 80 : 65,
        l.confidence || confidence(ctx, productModel.products.length, []),
        l.reason,
        'בדיקה ידנית של מחיר/עלות/לקוח - ללא שינוי אוטומטי'
      ));
    });

    customerDna.groups.churnRisk.rows.slice(0, 6).forEach(function (c) {
      rows.push(leak(
        'לקוח בעל ערך לא פעיל: ' + c.name,
        'inactive_high_value_customer',
        c.avgOrder || safeDiv(c.revenue, Math.max(1, c.orders)),
        c.daysSince >= 60 ? 90 : 70,
        confidence(ctx, customerDna.customers.length, []),
        'היסטורית מכניס ' + money(c.revenue) + ' ולא הזמין ' + c.daysSince + ' ימים',
        'בדיקת שימור ידנית היום'
      ));
    });

    customerDna.customers.filter(function (c) {
      return c.orders >= 3 && c.avgOrder < avgOrderValue(ctx.summary) * 0.65;
    }).slice(0, 6).forEach(function (c) {
      rows.push(leak(
        'סלים נמוכים חוזרים: ' + c.name,
        'repeated_low_basket_orders',
        Math.max(0, avgOrderValue(ctx.summary) - c.avgOrder) * c.orders * monthlyFactor,
        55,
        confidence(ctx, customerDna.customers.length, []),
        'הרבה הזמנות קטנות שמייצרות עומס ביחס להכנסה',
        'להציע סל מינימום/באנדל ידנית'
      ));
    });

    inventoryWarRoom.likelyRunOutSoon.slice(0, 6).forEach(function (p) {
      var loss = p.dailySales * safeDiv(p.revenue, Math.max(1, p.qty)) * Math.min(30, Math.max(1, p.stockDays || 1));
      rows.push(leak(
        'חוסר מלאי צפוי: ' + p.name,
        'stockout_lost_sales',
        loss,
        p.stockDays <= 7 ? 95 : 75,
        confidence(ctx, productModel.products.length, []),
        'הביקוש קיים והמלאי עלול לעצור מכירות',
        'בדיקת רכש/זמינות ידנית'
      ));
    });

    inventoryWarRoom.tiedCapital.slice(0, 6).forEach(function (p) {
      rows.push(leak(
        'הון נעול במלאי: ' + p.name,
        'dead_inventory_capital_lock',
        p.tiedCapital * 0.05,
        45,
        confidence(ctx, productModel.products.length, []),
        'מלאי × עלות יחידה יוצר הון תקוע',
        'לבחון באנדל/מבצע ידני'
      ));
    });

    rows.sort(function (a, b) {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return b.monthlyEstimatedLoss - a.monthlyEstimatedLoss;
    });
    return rows.slice(0, 14);
  }

  function customerActionRadar(ctx, customerDna) {
    var rows = [];
    function add(groupKey, label, action, urgency) {
      (customerDna.groups[groupKey].rows || []).slice(0, 6).forEach(function (c) {
        rows.push({
          name: c.name,
          segment: label,
          estimatedValue: c.avgOrder || safeDiv(c.revenue, Math.max(1, c.orders)),
          urgency: clamp(urgency + (c.daysSince >= 60 ? 10 : 0)),
          confidence: confidence(ctx, customerDna.customers.length, []),
          reason: c.reason,
          suggestedAction: action
        });
      });
    }
    add('sleepingHighValue', 'להחזיר עכשיו', 'בדיקת צורך להזמנה חוזרת', 85);
    add('growing', 'Upsell עכשיו', 'להציע סל משלים ידנית', 70);
    add('churnRisk', 'סיכון שימור', 'בדיקת שימור ידנית', 80);
    add('vip', 'להגן על VIP', 'לוודא זמינות מוצרים מרכזיים', 65);
    add('priceSensitive', 'רגיש למחיר', 'בדיקת מרווח לפני הנחה נוספת', 55);
    rows.sort(function (a, b) {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return b.estimatedValue - a.estimatedValue;
    });
    return rows.slice(0, 15);
  }

  function productActionRadar(ctx, productModel, inventoryWarRoom) {
    var rows = [];
    function addProduct(p, segment, action, urgency, reason) {
      rows.push({
        sku: p.sku,
        name: p.name,
        segment: segment,
        estimatedValue: p.revenue || 0,
        urgency: clamp(urgency),
        confidence: confidence(ctx, productModel.products.length, p.stock === null ? ['אין מלאי עדכני בפריט הזמנה'] : []),
        reason: reason,
        suggestedAction: action
      });
    }
    productModel.products.filter(function (p) {
      return p.qty > 0 && p.categoryAvgPrice > 0 && p.avgPrice < p.categoryAvgPrice * 0.92;
    }).slice(0, 6).forEach(function (p) {
      addProduct(p, 'מועמד להעלאת מחיר', 'בדיקת מחיר ידנית בלבד', 65, 'מחיר ממוצע נמוך מממוצע הקטגוריה');
    });
    inventoryWarRoom.deadStock.slice(0, 6).forEach(function (p) {
      addProduct(p, 'מועמד לבאנדל', 'לבחון באנדל עם מוצר מהיר', 50, p.reason);
    });
    inventoryWarRoom.restockPriorities.slice(0, 6).forEach(function (p) {
      addProduct(p, 'רכש דחוף', 'בדיקת רכש/זמינות', 92, p.reason);
    });
    inventoryWarRoom.slowMovers.slice(0, 6).forEach(function (p) {
      addProduct(p, 'איטי', 'בדיקת מיקום/באנדל', 45, p.reason);
    });
    inventoryWarRoom.highVelocity.slice(0, 6).forEach(function (p) {
      addProduct(p, 'כוכב', 'להבטיח מלאי וזמינות', 70, p.reason);
    });
    productModel.products.filter(function (p) {
      return p.marginAvailable && p.marginPct !== null && p.marginPct < 12;
    }).slice(0, 6).forEach(function (p) {
      addProduct(p, 'בעיית מרווח', 'בדיקת עלות/מחיר ידנית', 85, 'מרווח ' + p.marginPct + '% בלבד');
    });
    rows.sort(function (a, b) {
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return b.estimatedValue - a.estimatedValue;
    });
    return rows.slice(0, 15);
  }

  function recommendationQuality(ctx) {
    var times = ctx.orders.map(function (o) { return BIDataLoader.orderTimestampMs(o); })
      .filter(function (ms) { return ms > 0; })
      .sort(function (a, b) { return a - b; });
    var similarSignals = Math.max(0, times.length - 1);
    var wins = 0;
    var nextIdx = 1;
    times.forEach(function (ms, idx) {
      if (idx >= times.length - 1) return;
      if (nextIdx <= idx) nextIdx = idx + 1;
      while (nextIdx < times.length && times[nextIdx] <= ms) nextIdx += 1;
      if (nextIdx < times.length && times[nextIdx] <= ms + 30 * 864e5) wins += 1;
    });
    var successRate = similarSignals ? clamp((wins / similarSignals) * 100) : null;
    return {
      similarSignals: similarSignals,
      successRate: successRate,
      confidence: confidence(ctx, similarSignals, similarSignals < 5 ? ['מעט דפוסים היסטוריים להשוואה'] : []),
      explanation: similarSignals
        ? 'נמדד רק לפי חזרת פעילות בתוך 30 יום אחרי פעילות היסטורית דומה, ללא מעקב כתיבה'
        : 'אין מספיק אותות היסטוריים למדידת איכות המלצות'
    };
  }

  function top3Moves(ctx, opportunities, leaks) {
    var maxRevenue = Math.max(1, ctx.summary.revenue);
    var maxProfit = Math.max(1, ctx.summary.profitAvailable ? ctx.summary.profit : ctx.summary.revenue * 0.15);
    var rows = [];

    opportunities.slice(0, 10).forEach(function (o) {
      rows.push(actionRow(
        o.title,
        o.type,
        o.estimatedRevenueGain,
        o.estimatedProfitGain,
        maxRevenue,
        maxProfit,
        o.urgency,
        o.confidence,
        o.why + '. אפסייד משוער: ' + money(o.estimatedRevenueGain)
      ));
    });
    leaks.slice(0, 10).forEach(function (l) {
      rows.push(actionRow(
        l.title,
        l.type,
        l.monthlyEstimatedLoss,
        l.monthlyEstimatedLoss * 0.4,
        maxRevenue,
        maxProfit,
        l.urgency,
        l.confidence,
        l.why + '. הפסד חודשי משוער: ' + money(l.monthlyEstimatedLoss)
      ));
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    return rows.slice(0, 3);
  }

  function ownerCooMode(topMoves) {
    if (!topMoves.length) {
      return 'היום להתמקד באיסוף עוד נתוני הזמנות ועלויות, כי אין מספיק אותות אמינים לפעולת רווח ברורה.';
    }
    var names = topMoves.map(function (m) { return m.title; });
    return 'היום להתמקד ב-' + names.join(', ') + '. כל הפעולות הן בדיקה/החלטה ידנית בלבד, ללא שינוי אוטומטי במערכת.';
  }

  function build(ctx, productModel, customerDna, inventoryWarRoom, profitLeak) {
    var easyMoney = easyMoneyEngine(ctx, productModel, customerDna, inventoryWarRoom);
    var leaks = moneyLeakEnginePro(ctx, productModel, customerDna, inventoryWarRoom, profitLeak);
    var topMoves = top3Moves(ctx, easyMoney, leaks);
    return {
      commandCenter: dailyRevenueCommandCenter(ctx, productModel, easyMoney, leaks),
      easyMoney: easyMoney,
      leaks: leaks,
      customerRadar: customerActionRadar(ctx, customerDna),
      productRadar: productActionRadar(ctx, productModel, inventoryWarRoom),
      topMoves: topMoves,
      ownerCooMode: ownerCooMode(topMoves),
      recommendationQuality: recommendationQuality(ctx),
      formula: 'Top 3 Moves = Revenue Impact 45% + Profit Impact 30% + Urgency 15% + Confidence 10%',
      assumptions: 'ROS משתמש רק ב-orders/items ובמודולי BI קיימים. אין כתיבה, אין הודעות, אין יצירת הזמנות ואין שינוי מחירים או מלאי.'
    };
  }

  return { build: build };
})();
