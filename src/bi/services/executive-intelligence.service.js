var BIExecutiveIntelligenceService = (function () {
  'use strict';

  function money(n) {
    if (typeof App !== 'undefined' && App.fmtP) return '₪' + App.fmtP(n);
    return '₪' + String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function daysBackOrders(orders, endMs, days) {
    return BIDataLoader.filterOrdersInRange(orders, {
      start: new Date(endMs - days * 864e5),
      end: new Date(endMs)
    });
  }

  function aggregateDays(ctx, days) {
    return BIMetricsEngine.aggregate(daysBackOrders(ctx.orders, ctx.range.end.getTime(), days));
  }

  function confidenceAverage(trust) {
    var keys = Object.keys(trust);
    if (!keys.length) return 0;
    return BIScoringEngine.clamp(keys.reduce(function (s, key) { return s + (trust[key].score || 0); }, 0) / keys.length);
  }

  function riskLevel(decisionEngine, inventoryWarRoom, profitLeak) {
    var highRisks = decisionEngine.risks.filter(function (r) { return r.level === 'HIGH RISK'; }).length;
    var pressure = inventoryWarRoom.likelyRunOutSoon.length + profitLeak.leaks.length;
    if (highRisks >= 2 || pressure >= 8) return 'גבוה';
    if (highRisks >= 1 || pressure >= 3) return 'בינוני';
    return 'נמוך';
  }

  function commandCenter(ctx, decisionEngine, forecast, customerDna, inventoryWarRoom, profitLeak, trust) {
    var today = aggregateDays(ctx, 1);
    var week = aggregateDays(ctx, 7);
    var revenueMomentum = BIMetricsEngine.pctChange(ctx.summary.revenue, ctx.prevSummary.revenue);
    var activeCustomers = customerDna.customers.filter(function (c) { return c.currentOrders > 0; }).length;
    var previousCustomers = customerDna.customers.filter(function (c) { return c.previousOrders > 0; }).length;
    var customerMomentum = BIMetricsEngine.pctChange(activeCustomers, previousCustomers);
    var stockPressure = inventoryWarRoom.likelyRunOutSoon.length ? inventoryWarRoom.likelyRunOutSoon.length + ' מוצרים בסיכון חוסר' : 'אין לחץ מלאי ברור';
    var risk = riskLevel(decisionEngine, inventoryWarRoom, profitLeak);

    return {
      todayStatus: today.orders + ' הזמנות | ' + money(today.revenue),
      weekStatus: week.orders + ' הזמנות | ' + money(week.revenue),
      revenueMomentum: revenueMomentum,
      customerMomentum: customerMomentum,
      stockPressure: stockPressure,
      riskLevel: risk,
      bestActionsNow: decisionEngine.actions.slice(0, 3),
      confidencePct: confidenceAverage(trust),
      confidence: trust.executive,
      why: 'מרכז פיקוד מחבר הכנסות, לקוחות, מלאי, תחזית וסיכונים מתוך orders/items בלבד',
      forecastSummary: forecast.summary
    };
  }

  function decisionLab(decisionEngine, trust) {
    return {
      actions: decisionEngine.actions.slice(0, 5).map(function (a) {
        var difficulty = a.impactType === 'stock' ? 'בינונית' : (a.impactType === 'retention' ? 'קלה' : 'בינונית');
        var timeframe = a.urgency >= 85 ? 'היום' : (a.urgency >= 65 ? 'השבוע' : '30 יום');
        return {
          title: a.title,
          why: a.reasoning,
          estimatedRevenueUpside: a.revenueImpact,
          urgency: a.urgency,
          confidence: a.confidence,
          difficulty: difficulty,
          expectedTimeframe: timeframe,
          method: a.method
        };
      }),
      confidence: trust.decisionLab,
      formula: decisionEngine.formula
    };
  }

  function whatIfSimulator(ctx, productModel, customerDna, inventoryWarRoom, trust) {
    var topProduct = productModel.products.slice().sort(function (a, b) { return b.revenue - a.revenue; })[0] || null;
    var topCustomer = customerDna.customers.slice().sort(function (a, b) { return b.revenue - a.revenue; })[0] || null;
    var sleeping = customerDna.groups.sleepingHighValue.rows[0] || customerDna.groups.churnRisk.rows[0] || null;
    var stockRisk = inventoryWarRoom.likelyRunOutSoon[0] || null;
    var scenarios = [];

    if (topProduct) {
      scenarios.push({
        scenario: 'העלאת מחיר מוצר מוביל ב-5%',
        target: topProduct.name,
        estimatedImpact: parseFloat((topProduct.revenue * 0.05).toFixed(2)),
        explanation: 'השפעה = הכנסות מוצר בתקופה × 5%, ללא הנחת שינוי בביקוש',
        confidence: trust.simulator
      });
      scenarios.push({
        scenario: 'הנחה של 5% על מוצר מוביל',
        target: topProduct.name,
        estimatedImpact: parseFloat((topProduct.revenue * -0.05).toFixed(2)),
        explanation: 'השפעה ישירה = הכנסות מוצר בתקופה × מינוס 5%, ללא תחזית גידול כמות',
        confidence: trust.simulator
      });
    }
    if (topCustomer) {
      scenarios.push({
        scenario: 'איבוד לקוח מוביל',
        target: topCustomer.name,
        estimatedImpact: parseFloat((topCustomer.avgOrder * -1).toFixed(2)),
        explanation: 'השפעה = אובדן הזמנה ממוצעת היסטורית אחת של הלקוח',
        confidence: trust.simulator
      });
    }
    if (stockRisk) {
      scenarios.push({
        scenario: 'הגדלת מלאי למוצר בסיכון',
        target: stockRisk.name,
        estimatedImpact: parseFloat((stockRisk.dailySales * (stockRisk.revenue / Math.max(1, stockRisk.qty)) * 7).toFixed(2)),
        explanation: 'השפעה = הגנת הכנסה של שבוע לפי קצב מכירה יומי, ללא כתיבה למלאי',
        confidence: trust.simulator
      });
    }
    if (sleeping) {
      scenarios.push({
        scenario: 'החזרת לקוח רדום',
        target: sleeping.name,
        estimatedImpact: sleeping.avgOrder || parseFloat((sleeping.revenue / Math.max(1, sleeping.orders)).toFixed(2)),
        explanation: 'השפעה = ממוצע הזמנה היסטורי של הלקוח',
        confidence: trust.simulator
      });
    }

    return {
      scenarios: scenarios.slice(0, 8),
      confidence: trust.simulator,
      formula: 'כל הסימולציות הן השפעה חשבונאית בלבד על בסיס orders/items, ללא כתיבה, ללא שינוי מחיר וללא שינוי מלאי'
    };
  }

  function autoReports(ctx, forecast, customerDna, inventoryWarRoom, profitLeak, trust) {
    var today = aggregateDays(ctx, 1);
    var week = aggregateDays(ctx, 7);
    var month = aggregateDays(ctx, 30);
    var topWin = customerDna.groups.growing.rows[0] ? 'לקוח בצמיחה: ' + customerDna.groups.growing.rows[0].name : 'אין לקוח צמיחה ברור';
    var topLoss = customerDna.groups.churnRisk.rows[0] ? 'סיכון נטישה: ' + customerDna.groups.churnRisk.rows[0].name : 'אין סיכון נטישה בולט';
    var urgent = inventoryWarRoom.likelyRunOutSoon[0] ? 'דחוף: בדיקת מלאי ' + inventoryWarRoom.likelyRunOutSoon[0].name : 'אין דחיפות מלאי בולטת';

    return {
      daily: {
        title: 'מה השתנה היום',
        lines: [
          today.orders + ' הזמנות היום, הכנסות ' + money(today.revenue),
          urgent,
          profitLeak.summary
        ],
        confidence: trust.reports
      },
      weekly: {
        title: 'שבועי: ניצחונות / הפסדים / דחוף',
        lines: [
          'השבוע: ' + week.orders + ' הזמנות, ' + money(week.revenue),
          'ניצחון: ' + topWin,
          'הפסד/סיכון: ' + topLoss,
          urgent
        ],
        confidence: trust.reports
      },
      monthly: {
        title: 'חודשי: צמיחה / ירידה / מהלך הבא',
        lines: [
          '30 יום: ' + month.orders + ' הזמנות, ' + money(month.revenue),
          'תחזית 30 יום קדימה: ' + money(forecast.revenue30Days),
          'מהלך הבא: ' + (inventoryWarRoom.restockPriorities[0] ? inventoryWarRoom.restockPriorities[0].reason : 'לעקוב אחרי לקוחות ומוצרים מובילים')
        ],
        confidence: trust.reports
      }
    };
  }

  function build(ctx, productModel, decisionEngine, forecast, customerDna, inventoryWarRoom, profitLeak, trust) {
    return {
      commandCenter: commandCenter(ctx, decisionEngine, forecast, customerDna, inventoryWarRoom, profitLeak, trust),
      decisionLab: decisionLab(decisionEngine, trust),
      whatIfSimulator: whatIfSimulator(ctx, productModel, customerDna, inventoryWarRoom, trust),
      autoReports: autoReports(ctx, forecast, customerDna, inventoryWarRoom, profitLeak, trust)
    };
  }

  return { build: build };
})();
