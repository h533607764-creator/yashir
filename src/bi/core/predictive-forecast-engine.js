var BIPredictiveForecastEngine = (function () {
  'use strict';

  function fmtMoney(n) {
    if (typeof App !== 'undefined' && App.fmtP) return '₪' + App.fmtP(n);
    return '₪' + String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function safeDiv(a, b) {
    a = parseFloat(a) || 0;
    b = parseFloat(b) || 0;
    return b === 0 ? 0 : a / b;
  }

  function dailyRevenueMap(orders) {
    var map = {};
    orders.forEach(function (o) {
      var ms = BIDataLoader.orderTimestampMs(o);
      if (!ms) return;
      var key = BIDataLoader.dateKey(new Date(ms), 'daily');
      if (!map[key]) map[key] = { revenue: 0, orders: 0 };
      map[key].orders += 1;
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        map[key].revenue += BIDataLoader.lineRevenue(item);
      });
    });
    return map;
  }

  function rangeTotals(map, startMs, endMs) {
    var out = { revenue: 0, orders: 0, daysWithOrders: 0 };
    Object.keys(map).forEach(function (key) {
      var ms = new Date(key + 'T00:00:00').getTime();
      if (!ms || ms < startMs || ms >= endMs) return;
      out.revenue += map[key].revenue;
      out.orders += map[key].orders;
      out.daysWithOrders += map[key].orders > 0 ? 1 : 0;
    });
    out.revenue = parseFloat(out.revenue.toFixed(2));
    return out;
  }

  function forecastRevenue(ctx, days) {
    var nowMs = ctx.range.end.getTime();
    var map = dailyRevenueMap(ctx.orders);
    var recent = rangeTotals(map, nowMs - 30 * 864e5, nowMs);
    var previous = rangeTotals(map, nowMs - 60 * 864e5, nowMs - 30 * 864e5);
    var all = rangeTotals(map, 0, nowMs);
    var historyDays = Math.max(1, Math.ceil((nowMs - ctx.orders.reduce(function (min, o) {
      var ms = BIDataLoader.orderTimestampMs(o);
      return ms && ms < min ? ms : min;
    }, nowMs)) / 864e5));
    var baseDaily = recent.revenue > 0 ? safeDiv(recent.revenue, 30) : safeDiv(all.revenue, historyDays);
    var momentum = previous.revenue > 0 ? safeDiv(recent.revenue, previous.revenue) : (recent.revenue > 0 ? 1.08 : 1);
    momentum = Math.max(0.6, Math.min(1.4, momentum));
    return parseFloat((baseDaily * days * momentum).toFixed(2));
  }

  function build(ctx, productModel, customerDna, trust) {
    var nowMs = ctx.range.end.getTime();
    var revenue7 = forecastRevenue(ctx, 7);
    var revenue30 = forecastRevenue(ctx, 30);
    var map = dailyRevenueMap(ctx.orders);
    var recentOrders = rangeTotals(map, nowMs - 30 * 864e5, nowMs).orders;
    var avgOrders = safeDiv(recentOrders || ctx.orders.length, recentOrders ? 30 : Math.max(1, ctx.orders.length ? 90 : 1));
    var likelyStockouts = productModel.products.filter(function (p) {
      return p.stockDays !== null && p.stockDays <= 30 && p.dailySales > 0;
    }).sort(function (a, b) {
      return a.stockDays - b.stockDays;
    }).slice(0, 8).map(function (p) {
      return {
        name: p.name,
        sku: p.sku,
        stockDays: p.stockDays,
        reason: 'מלאי נוכחי בפריט הזמנה מספיק לכ-' + p.stockDays + ' ימים לפי קצב המכירה בתקופה'
      };
    });
    var slowingCustomers = (customerDna.groups.churnRisk.rows || []).concat(customerDna.groups.sleepingHighValue.rows || []).slice(0, 8);

    return {
      revenue7Days: revenue7,
      revenue30Days: revenue30,
      expectedOrders7Days: parseFloat((avgOrders * 7).toFixed(1)),
      expectedOrders30Days: parseFloat((avgOrders * 30).toFixed(1)),
      likelyStockouts: likelyStockouts,
      slowingCustomers: slowingCustomers,
      confidence: trust.forecast,
      formula: 'תחזית הכנסות = ממוצע יומי 30 יום × מספר ימים × מומנטום 30 יום מול 30 יום קודמים, מוגבל ל-60%-140%',
      summary: '7 ימים: ' + fmtMoney(revenue7) + ' | 30 ימים: ' + fmtMoney(revenue30)
    };
  }

  return { build: build };
})();
