var BIPredictiveEmpireService = (function () {
  'use strict';

  function num(n) {
    n = parseFloat(n);
    return isFinite(n) && !isNaN(n) ? n : 0;
  }

  function div(a, b) {
    a = num(a);
    b = num(b);
    return b === 0 ? 0 : a / b;
  }

  function clamp(n, min, max) {
    n = num(n);
    return Math.max(min, Math.min(max, n));
  }

  function round(n, digits) {
    var m = Math.pow(10, digits || 0);
    return Math.round(num(n) * m) / m;
  }

  function money(n) {
    if (typeof App !== 'undefined' && App.fmtP) return '₪' + App.fmtP(n);
    return '₪' + String(round(n, 2)).replace(/\.00$/, '');
  }

  function trust(ctx, rows, missing, comparison) {
    return BITrustEngine.metric(ctx.orders.length, rows || 0, comparison !== false, missing || []);
  }

  function orderMs(o) {
    return BIDataLoader.orderTimestampMs(o);
  }

  function dayKey(ms) {
    return BIDataLoader.dateKey(new Date(ms), 'daily');
  }

  function dailyHistory(ctx) {
    var map = {};
    var firstMs = 0;
    ctx.orders.forEach(function (o) {
      var ms = orderMs(o);
      if (!ms) return;
      if (!firstMs || ms < firstMs) firstMs = ms;
      var key = dayKey(ms);
      if (!map[key]) map[key] = { key: key, ms: new Date(key + 'T00:00:00').getTime(), weekday: new Date(ms).getDay(), revenue: 0, orders: 0, profit: 0, profitLines: 0, missingCost: 0 };
      map[key].orders += 1;
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        var qty = num(item.qty);
        var revenue = BIDataLoader.lineRevenue(item);
        var cost = BIDataLoader.lineCost(item);
        map[key].revenue += revenue;
        if (cost === null) map[key].missingCost += 1;
        else {
          map[key].profit += revenue - (cost * qty);
          map[key].profitLines += 1;
        }
      });
    });
    var days = Object.keys(map).sort().map(function (key) {
      var d = map[key];
      d.revenue = round(d.revenue, 2);
      d.profit = round(d.profit, 2);
      return d;
    });
    return {
      days: days,
      firstMs: firstMs,
      historyDays: firstMs ? Math.max(1, Math.ceil((ctx.range.end.getTime() - firstMs) / 864e5)) : 0
    };
  }

  function sumDays(days, endMs, span, field) {
    var start = endMs - span * 864e5;
    return days.reduce(function (s, d) {
      return d.ms >= start && d.ms < endMs ? s + num(d[field]) : s;
    }, 0);
  }

  function avgForWeekday(days, weekday, endMs, lookbackDays) {
    var start = endMs - lookbackDays * 864e5;
    var rows = days.filter(function (d) { return d.weekday === weekday && d.ms >= start && d.ms < endMs; });
    if (!rows.length) return null;
    return div(rows.reduce(function (s, d) { return s + d.revenue; }, 0), rows.length);
  }

  function volatility(days, endMs) {
    var rows = days.filter(function (d) { return d.ms >= endMs - 60 * 864e5 && d.ms < endMs; });
    if (rows.length < 5) return 0.25;
    var avg = div(rows.reduce(function (s, d) { return s + d.revenue; }, 0), rows.length);
    if (avg <= 0) return 0.35;
    var variance = div(rows.reduce(function (s, d) { return s + Math.pow(d.revenue - avg, 2); }, 0), rows.length);
    return clamp(Math.sqrt(variance) / avg, 0.12, 0.45);
  }

  function forecastRevenue(ctx, history, horizon) {
    var endMs = ctx.range.end.getTime();
    var days = history.days;
    var recent7 = div(sumDays(days, endMs, 7, 'revenue'), 7);
    var recent30 = div(sumDays(days, endMs, 30, 'revenue'), 30);
    var previous30 = div(sumDays(days, endMs - 30 * 864e5, 30, 'revenue'), 30);
    var base = recent30 > 0 ? ((recent7 * 0.45) + (recent30 * 0.40) + (previous30 * 0.15)) : div(ctx.summary.revenue, Math.max(1, Math.ceil((ctx.range.end.getTime() - ctx.range.start.getTime()) / 864e5)));
    var momentum = previous30 > 0 ? clamp(recent30 / previous30, 0.75, 1.25) : 1;
    var seasonality = 1;
    if (history.historyDays >= 180) {
      var last90 = div(sumDays(days, endMs, 90, 'revenue'), 90);
      var prev90 = div(sumDays(days, endMs - 90 * 864e5, 90, 'revenue'), 90);
      if (prev90 > 0) seasonality = clamp(last90 / prev90, 0.85, 1.18);
    }
    var total = 0;
    for (var i = 1; i <= horizon; i++) {
      var future = new Date(endMs + i * 864e5);
      var weekdayAvg = avgForWeekday(days, future.getDay(), endMs, Math.min(180, Math.max(30, history.historyDays))) || base;
      total += ((weekdayAvg * 0.35) + (base * 0.65)) * momentum * seasonality;
    }
    var vol = volatility(days, endMs);
    var conf = trust(ctx, days.length, history.historyDays < horizon * 2 ? ['עומק היסטוריה מוגבל ביחס לטווח התחזית'] : [], true);
    var rangeWidth = vol * (conf.score >= 75 ? 0.75 : (conf.score >= 50 ? 1 : 1.3));
    return {
      days: horizon,
      value: round(total, 2),
      bestCase: round(total * (1 + rangeWidth), 2),
      worstCase: round(Math.max(0, total * (1 - rangeWidth)), 2),
      confidence: conf,
      formula: 'תחזית = 65% קצב יומי משוקלל + 35% דפוס יום בשבוע, כפול מומנטום 30 יום ועונתיות אם קיימים 180+ ימי היסטוריה'
    };
  }

  function customerProfiles(ctx) {
    var map = {};
    ctx.orders.forEach(function (o) {
      var ms = orderMs(o);
      if (!ms) return;
      var key = String(o.customerId || o.customerName || 'unknown');
      var name = BIDataLoader.customerLabel(o.customerName || key) || key;
      if (!map[key]) map[key] = { key: key, name: name, revenue: 0, orders: 0, dates: [], orderValues: [], recentRevenue: 0, previousRevenue: 0 };
      var val = 0;
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        val += BIDataLoader.lineRevenue(item);
      });
      map[key].revenue += val;
      map[key].orders += 1;
      map[key].dates.push(ms);
      map[key].orderValues.push({ ms: ms, value: val });
      if (ms >= ctx.range.end.getTime() - 30 * 864e5) map[key].recentRevenue += val;
      else if (ms >= ctx.range.end.getTime() - 60 * 864e5) map[key].previousRevenue += val;
    });
    return Object.keys(map).map(function (key) {
      var c = map[key];
      c.dates.sort(function (a, b) { return a - b; });
      var intervals = [];
      for (var i = 1; i < c.dates.length; i++) intervals.push((c.dates[i] - c.dates[i - 1]) / 864e5);
      c.avgCycle = intervals.length ? div(intervals.reduce(function (s, x) { return s + x; }, 0), intervals.length) : 30;
      c.lastMs = c.dates[c.dates.length - 1] || 0;
      c.daysSince = c.lastMs ? Math.max(0, Math.floor((ctx.range.end.getTime() - c.lastMs) / 864e5)) : 999;
      c.avgOrder = div(c.revenue, Math.max(1, c.orders));
      var recentVals = c.orderValues.filter(function (x) { return x.ms >= ctx.range.end.getTime() - 30 * 864e5; });
      var prevVals = c.orderValues.filter(function (x) { return x.ms >= ctx.range.end.getTime() - 60 * 864e5 && x.ms < ctx.range.end.getTime() - 30 * 864e5; });
      c.recentAov = recentVals.length ? div(recentVals.reduce(function (s, x) { return s + x.value; }, 0), recentVals.length) : c.avgOrder;
      c.prevAov = prevVals.length ? div(prevVals.reduce(function (s, x) { return s + x.value; }, 0), prevVals.length) : c.avgOrder;
      return c;
    });
  }

  function customerFutureRadar(ctx) {
    var customers = customerProfiles(ctx);
    var avgRevenue = customers.length ? div(customers.reduce(function (s, c) { return s + c.revenue; }, 0), customers.length) : 0;
    var vipLine = avgRevenue * 1.4;
    var rows = [];
    customers.forEach(function (c) {
      var dueRatio = div(c.daysSince, Math.max(1, c.avgCycle));
      var orderProb = clamp(100 - Math.abs(1 - dueRatio) * 45, 5, 95);
      var growthProb = clamp(45 + (div(c.recentRevenue - c.previousRevenue, Math.max(1, c.previousRevenue)) * 35) + Math.min(c.orders, 8) * 3, 5, 95);
      var churnProb = clamp((dueRatio - 1) * 50 + (c.revenue >= avgRevenue ? 20 : 0), 5, 95);
      var reduceProb = clamp(45 + div(c.prevAov - c.recentAov, Math.max(1, c.prevAov)) * 55, 5, 95);
      var vipProb = clamp((div(c.revenue, Math.max(1, vipLine)) * 70) + (c.recentRevenue > c.previousRevenue ? 15 : 0), 5, 95);
      var conf = trust(ctx, customers.length, c.orders < 2 ? ['ללקוח מעט הזמנות היסטוריות'] : [], true);
      rows.push({ name: c.name, type: 'צפוי להזמין השבוע', probability: round(orderProb, 0), expectedValue: round(c.avgOrder, 2), confidence: conf, reason: 'מחזור הזמנה ממוצע ' + round(c.avgCycle, 1) + ' ימים, עברו ' + c.daysSince + ' ימים' });
      rows.push({ name: c.name, type: 'צמיחת הוצאה בקרוב', probability: round(growthProb, 0), expectedValue: round(Math.max(c.avgOrder, c.recentRevenue * 0.35), 2), confidence: conf, reason: 'השוואת 30 יום אחרונים מול 30 יום קודמים' });
      rows.push({ name: c.name, type: 'סיכון היעלמות/נטישה', probability: round(churnProb, 0), expectedValue: round(c.avgOrder, 2), confidence: conf, reason: 'ימים מאז הזמנה מול מחזור היסטורי' });
      rows.push({ name: c.name, type: 'הקטנת סל', probability: round(reduceProb, 0), expectedValue: round(Math.max(0, c.prevAov - c.recentAov), 2), confidence: conf, reason: 'סל ממוצע אחרון מול סל קודם' });
      rows.push({ name: c.name, type: 'יכול להפוך VIP', probability: round(vipProb, 0), expectedValue: round(vipLine - c.revenue > 0 ? vipLine - c.revenue : c.avgOrder, 2), confidence: conf, reason: 'קרבה לרף VIP וצמיחה אחרונה' });
    });
    rows.sort(function (a, b) { return b.probability - a.probability; });
    return rows.slice(0, 18);
  }

  function productDemandForecast(ctx, productModel, inventoryWarRoom) {
    var rows = [];
    productModel.products.forEach(function (p) {
      var qtyGrowth = BIMetricsEngine.pctChange(p.qty || 0, p.prevQty || 0);
      var conf = trust(ctx, productModel.products.length, p.stock === null ? ['אין מלאי עדכני בפריט הזמנה'] : [], true);
      if (qtyGrowth >= 25 || (p.dailySales || 0) > 0 && p.daysSince <= 7) {
        rows.push({ sku: p.sku, name: p.name, type: 'ספייק ביקוש צפוי', confidence: conf, probability: clamp(55 + qtyGrowth / 2, 55, 95), reason: 'כמות נוכחית מול קודמת: ' + qtyGrowth + '%', expectedValue: p.revenue });
      }
      if (qtyGrowth <= -25 && p.prevQty > 0) {
        rows.push({ sku: p.sku, name: p.name, type: 'האטה צפויה', confidence: conf, probability: clamp(55 + Math.abs(qtyGrowth) / 2, 55, 95), reason: 'ירידה בכמות מול תקופה קודמת', expectedValue: p.revenue });
      }
      if (p.stock !== null && p.stock > 0 && p.daysSince >= 45) {
        rows.push({ sku: p.sku, name: p.name, type: 'בדרך למלאי מת', confidence: conf, probability: clamp(45 + p.daysSince / 2, 50, 95), reason: 'עברו ' + p.daysSince + ' ימים מאז מכירה אחרונה ויש מלאי', expectedValue: p.stock * (p.avgPrice || 0) });
      }
      if (p.stockDays !== null && p.stockDays <= 30) {
        rows.push({ sku: p.sku, name: p.name, type: 'חוסר מלאי צפוי', confidence: conf, probability: clamp(95 - p.stockDays, 50, 98), reason: 'ימי מלאי לפי ביקוש: ' + p.stockDays, expectedValue: p.revenue });
      }
      if ((p.qty || 0) >= Math.max(2, (p.prevQty || 0) * 1.15) && p.daysSince <= 14) {
        rows.push({ sku: p.sku, name: p.name, type: 'ביקוש חוזר עולה', confidence: conf, probability: clamp(60 + qtyGrowth / 3, 55, 95), reason: 'מכירה חוזרת בתקופה וקצב עולה', expectedValue: p.revenue });
      }
    });
    inventoryWarRoom.highVelocity.slice(0, 5).forEach(function (p) {
      rows.push({ sku: p.sku, name: p.name, type: 'מוצר כוכב להמשך ביקוש', confidence: inventoryWarRoom.confidence, probability: 75, reason: p.reason, expectedValue: p.revenue });
    });
    rows.sort(function (a, b) { return b.probability - a.probability; });
    return rows.slice(0, 18);
  }

  function cashflowWarnings(ctx, forecasts, customerRows, productRows) {
    var warnings = [];
    var recent7 = sumDays(dailyHistory(ctx).days, ctx.range.end.getTime(), 7, 'revenue');
    if (forecasts[0].value < recent7 * 0.85) warnings.push({ title: 'שבוע קרוב חלש', urgency: 80, impact: round(recent7 - forecasts[0].value, 2), impactLabel: money(recent7 - forecasts[0].value), reason: 'תחזית 7 ימים נמוכה מ-85% מהשבוע האחרון', confidence: forecasts[0].confidence });
    if (forecasts[1].value < ctx.summary.revenue * 0.85 && ctx.summary.revenue > 0) warnings.push({ title: 'טרנד חודש חלש', urgency: 75, impact: round(ctx.summary.revenue - forecasts[1].value, 2), impactLabel: money(ctx.summary.revenue - forecasts[1].value), reason: 'תחזית 30 יום נמוכה מהקצב בתקופה הנוכחית', confidence: forecasts[1].confidence });
    var customers = customerProfiles(ctx).sort(function (a, b) { return b.revenue - a.revenue; });
    var topRevenue = customers.slice(0, 3).reduce(function (s, c) { return s + c.revenue; }, 0);
    var totalRevenue = customers.reduce(function (s, c) { return s + c.revenue; }, 0);
    var topShare = div(topRevenue, Math.max(1, totalRevenue)) * 100;
    if (topShare >= 45) warnings.push({ title: 'תלות גבוהה בלקוחות מובילים', urgency: 70, impact: round(topShare, 1), impactLabel: round(topShare, 1) + '%', reason: '3 לקוחות מובילים מייצרים ' + round(topShare, 1) + '% מההכנסה', confidence: trust(ctx, customers.length, [], true) });
    var aov = div(ctx.summary.revenue, Math.max(1, ctx.summary.orders));
    var prevAov = div(ctx.prevSummary.revenue, Math.max(1, ctx.prevSummary.orders));
    if (prevAov > 0 && aov < prevAov * 0.9) warnings.push({ title: 'סל ממוצע מתכווץ', urgency: 65, impact: round(prevAov - aov, 2), impactLabel: money(prevAov - aov), reason: 'AOV נוכחי נמוך ב-10%+ מהתקופה הקודמת', confidence: trust(ctx, ctx.filtered.length, [], true) });
    var churnWatch = customerRows.filter(function (r) { return r.type === 'סיכון היעלמות/נטישה' && r.probability >= 70; }).length;
    if (churnWatch) warnings.push({ title: 'מחזורי הזמנה מאטים', urgency: 78, impact: churnWatch, impactLabel: churnWatch + ' לקוחות', reason: churnWatch + ' לקוחות חורגים ממחזור ההזמנה שלהם', confidence: trust(ctx, churnWatch, [], true) });
    var stockWatch = productRows.filter(function (r) { return r.type === 'חוסר מלאי צפוי'; }).length;
    if (stockWatch) warnings.push({ title: 'לחץ מלאי עתידי', urgency: 85, impact: stockWatch, impactLabel: stockWatch + ' מוצרים', reason: stockWatch + ' מוצרים בדרך לחוסר מלאי', confidence: trust(ctx, stockWatch, [], false) });
    return warnings.sort(function (a, b) { return b.urgency - a.urgency; }).slice(0, 8);
  }

  function futureScore(forecasts, customerRows, productRows, warnings, inventoryWarRoom) {
    var demandMomentum = forecasts[1].value >= forecasts[0].value ? 70 : 50;
    var customerHealth = 100 - Math.min(50, customerRows.filter(function (r) { return r.type === 'סיכון היעלמות/נטישה' && r.probability >= 70; }).length * 8);
    var forecastGrowth = forecasts[1].confidence.score;
    var stockReadiness = 100 - Math.min(60, inventoryWarRoom.likelyRunOutSoon.length * 10);
    var concentrationRisk = 100 - Math.min(50, warnings.filter(function (w) { return w.title.indexOf('תלות') >= 0; }).length * 35);
    var churnRisk = customerHealth;
    var score = (demandMomentum * 0.2) + (customerHealth * 0.2) + (forecastGrowth * 0.2) + (stockReadiness * 0.15) + (concentrationRisk * 0.15) + (churnRisk * 0.1);
    return {
      score: BIScoringEngine.clamp(score),
      parts: {
        demandMomentum: BIScoringEngine.clamp(demandMomentum),
        customerHealth: BIScoringEngine.clamp(customerHealth),
        forecastGrowth: BIScoringEngine.clamp(forecastGrowth),
        stockReadiness: BIScoringEngine.clamp(stockReadiness),
        concentrationRisk: BIScoringEngine.clamp(concentrationRisk),
        churnRisk: BIScoringEngine.clamp(churnRisk)
      },
      formula: 'Future Score = ביקוש 20%, בריאות לקוחות 20%, ביטחון תחזית 20%, מוכנות מלאי 15%, ריכוזיות 15%, נטישה 10%'
    };
  }

  function noActionScenario(ctx, forecasts, customerRows, productRows, revenueOS) {
    var recent30 = ctx.summary.revenue;
    var drift = forecasts[1].value - recent30;
    return {
      revenueDrift: round(drift, 2),
      stockouts: productRows.filter(function (r) { return r.type === 'חוסר מלאי צפוי'; }).slice(0, 6),
      lostCustomers: customerRows.filter(function (r) { return r.type === 'סיכון היעלמות/נטישה' && r.probability >= 70; }).slice(0, 6),
      deadStockGrowth: productRows.filter(function (r) { return r.type === 'בדרך למלאי מת'; }).slice(0, 6),
      profitLeakage: revenueOS.leaks.slice(0, 5),
      assumption: 'תרחיש ללא פעולה = המשך קצב 30 יום, ללא שינוי מחיר/מלאי/לקוחות וללא פעולות אוטומטיות'
    };
  }

  function opportunityClock(ctx, customerRows, productRows, inventoryWarRoom) {
    var rows = [];
    customerRows.filter(function (r) { return r.type === 'צפוי להזמין השבוע' && r.probability >= 65; }).slice(0, 5).forEach(function (r) {
      rows.push({ title: r.name, type: 'לקוח אמור להזמין', expiresIn: '7 ימים', confidence: r.confidence, reason: r.reason });
    });
    productRows.filter(function (r) { return r.type === 'ספייק ביקוש צפוי' || r.type === 'ביקוש חוזר עולה'; }).slice(0, 5).forEach(function (r) {
      rows.push({ title: r.name, type: 'מוצר צובר תאוצה', expiresIn: '14 ימים', confidence: r.confidence, reason: r.reason });
    });
    inventoryWarRoom.deadStock.slice(0, 4).forEach(function (p) {
      rows.push({ title: p.name, type: 'מלאי מוכן לדחיפה', expiresIn: '30 ימים', confidence: inventoryWarRoom.confidence, reason: p.reason });
    });
    var weekday = new Date(ctx.range.end.getTime() + 7 * 864e5).getDay();
    rows.push({ title: 'חלון מכירות לפי יום בשבוע ' + weekday, type: 'דפוס שבועי', expiresIn: 'השבוע', confidence: trust(ctx, ctx.orders.length, [], true), reason: 'מבוסס על דפוסי הזמנות היסטוריים לפי ימי השבוע' });
    return rows.slice(0, 12);
  }

  function preventiveMoves(customerRows, productRows, warnings, clock) {
    var rows = [];
    customerRows.filter(function (r) { return r.type === 'סיכון היעלמות/נטישה' || r.type === 'צפוי להזמין השבוע'; }).slice(0, 4).forEach(function (r) {
      rows.push({ title: 'לטפל בלקוח: ' + r.name, urgency: r.probability, confidence: r.confidence, why: r.reason, suggestion: 'בדיקה ידנית בלבד, ללא שליחת הודעה אוטומטית' });
    });
    productRows.filter(function (r) { return r.type === 'חוסר מלאי צפוי' || r.type === 'ספייק ביקוש צפוי'; }).slice(0, 4).forEach(function (r) {
      rows.push({ title: 'לטפל במוצר: ' + r.name, urgency: r.probability, confidence: r.confidence, why: r.reason, suggestion: r.type === 'חוסר מלאי צפוי' ? 'בדיקת רכש ידנית' : 'להעלות נראות ידנית' });
    });
    warnings.slice(0, 3).forEach(function (w) {
      rows.push({ title: 'להקטין סיכון: ' + w.title, urgency: w.urgency, confidence: w.confidence, why: w.reason, suggestion: 'בדיקה ניהולית ידנית' });
    });
    clock.slice(0, 3).forEach(function (o) {
      rows.push({ title: 'לנצל חלון: ' + o.title, urgency: 65, confidence: o.confidence, why: o.reason, suggestion: 'בדיקה ידנית לפני שהחלון נסגר' });
    });
    rows.sort(function (a, b) { return b.urgency - a.urgency; });
    return rows.slice(0, 5);
  }

  function executiveBrief(forecasts, customerRows, productRows, warnings, moves) {
    var opportunity = moves[0] ? moves[0].title : 'אין הזדמנות ברורה עם ביטחון מספיק';
    var risk = warnings[0] ? warnings[0].title : 'אין סיכון עתידי חריג';
    var watchCustomers = customerRows.slice(0, 3).map(function (r) { return r.name; }).join(', ') || 'אין';
    var inventoryPressure = productRows.filter(function (r) { return r.type === 'חוסר מלאי צפוי'; }).slice(0, 3).map(function (r) { return r.name; }).join(', ') || 'אין לחץ מלאי ברור';
    return {
      today: 'ההזדמנות הקרובה: ' + opportunity + '. הסיכון המתקרב: ' + risk + '.',
      week: 'טווח הכנסות שבועי צפוי: ' + money(forecasts[0].worstCase) + ' עד ' + money(forecasts[0].bestCase) + '. לקוחות למעקב: ' + watchCustomers + '. לחץ מלאי: ' + inventoryPressure + '.',
      month: 'כיוון החודש: ' + (forecasts[1].value >= forecasts[0].value * 4 ? 'חיובי/יציב' : 'חלש') + '. מהלך קריטי עכשיו: ' + opportunity + '.'
    };
  }

  function build(ctx, productModel, customerDna, inventoryWarRoom, revenueOS) {
    var history = dailyHistory(ctx);
    var forecasts = [forecastRevenue(ctx, history, 7), forecastRevenue(ctx, history, 30), forecastRevenue(ctx, history, 90)];
    var customerRows = customerFutureRadar(ctx, customerDna);
    var productRows = productDemandForecast(ctx, productModel, inventoryWarRoom);
    var warnings = cashflowWarnings(ctx, forecasts, customerRows, productRows);
    var clock = opportunityClock(ctx, customerRows, productRows, inventoryWarRoom);
    var moves = preventiveMoves(customerRows, productRows, warnings, clock);
    var score = futureScore(forecasts, customerRows, productRows, warnings, inventoryWarRoom);
    return {
      futureRevenue: forecasts,
      customerFutureRadar: customerRows,
      productDemandForecast: productRows,
      cashflowWarnings: warnings,
      preventiveMoves: moves,
      futureScore: score,
      noActionScenario: noActionScenario(ctx, forecasts, customerRows, productRows, revenueOS),
      opportunityClock: clock,
      executiveFutureBrief: executiveBrief(forecasts, customerRows, productRows, warnings, moves),
      assumptions: 'Predictive Empire משתמש רק בהיסטוריית orders/items ובמודולי BI קיימים. אין כתיבה, אין פעולות אוטומטיות, אין שינוי מחיר/מלאי/הזמנות.',
      confidenceLogic: 'Confidence = נפח נתונים + עומק היסטורי + השוואה לתקופה קודמת + חוסרי נתונים כמו עלות או מלאי'
    };
  }

  return { build: build };
})();
