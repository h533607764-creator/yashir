var BICustomerDnaModel = (function () {
  'use strict';

  function percentile(rows, field, pct) {
    if (!rows.length) return 0;
    var vals = rows.map(function (r) { return parseFloat(r[field]) || 0; }).sort(function (a, b) { return a - b; });
    var idx = Math.max(0, Math.min(vals.length - 1, Math.floor((vals.length - 1) * pct)));
    return vals[idx];
  }

  function group(title, rows, confidence) {
    return {
      title: title,
      count: rows.length,
      rows: rows.slice(0, 12),
      confidence: confidence
    };
  }

  function addOrder(map, o, bucket, nowMs) {
    var key = String(o.customerId || o.customerName || 'unknown');
    var name = BIDataLoader.customerLabel(o.customerName || key) || key;
    if (!map[key]) {
      map[key] = {
        key: key,
        name: name,
        revenue: 0,
        currentRevenue: 0,
        previousRevenue: 0,
        orders: 0,
        currentOrders: 0,
        previousOrders: 0,
        qty: 0,
        firstMs: 0,
        lastMs: 0,
        avgUnitPrice: 0,
        reason: ''
      };
    }
    var c = map[key];
    var ms = BIDataLoader.orderTimestampMs(o);
    if (!c.firstMs || ms < c.firstMs) c.firstMs = ms;
    c.lastMs = Math.max(c.lastMs, ms);
    if (bucket === 'all') c.orders += 1;
    if (bucket === 'current') c.currentOrders += 1;
    if (bucket === 'previous') c.previousOrders += 1;
    (o.items || []).forEach(function (item) {
      if (!BIDataLoader.isProductLine(item)) return;
      var qty = parseFloat(item.qty);
      if (isNaN(qty)) qty = 0;
      var revenue = BIDataLoader.lineRevenue(item);
      if (bucket === 'all') {
        c.revenue += revenue;
        c.qty += qty;
      }
      if (bucket === 'current') c.currentRevenue += revenue;
      if (bucket === 'previous') c.previousRevenue += revenue;
    });
    c.daysSince = c.lastMs ? Math.max(0, Math.floor((nowMs - c.lastMs) / 864e5)) : 999;
    c.daysSinceFirst = c.firstMs ? Math.max(0, Math.floor((nowMs - c.firstMs) / 864e5)) : 999;
  }

  function build(ctx, trust) {
    var nowMs = ctx.range.end.getTime();
    var map = {};
    ctx.orders.forEach(function (o) { addOrder(map, o, 'all', nowMs); });
    ctx.filtered.forEach(function (o) { addOrder(map, o, 'current', nowMs); });
    ctx.previous.forEach(function (o) { addOrder(map, o, 'previous', nowMs); });

    var customers = Object.keys(map).map(function (key) {
      var c = map[key];
      c.revenue = parseFloat(c.revenue.toFixed(2));
      c.currentRevenue = parseFloat(c.currentRevenue.toFixed(2));
      c.previousRevenue = parseFloat(c.previousRevenue.toFixed(2));
      c.avgOrder = c.orders > 0 ? parseFloat((c.revenue / c.orders).toFixed(2)) : 0;
      c.avgUnitPrice = c.qty > 0 ? parseFloat((c.revenue / c.qty).toFixed(2)) : 0;
      return c;
    });

    var avgRevenue = customers.length ? customers.reduce(function (s, c) { return s + c.revenue; }, 0) / customers.length : 0;
    var avgUnit = customers.length ? customers.reduce(function (s, c) { return s + c.avgUnitPrice; }, 0) / customers.length : 0;
    var vipCutoff = Math.max(avgRevenue * 1.4, percentile(customers, 'revenue', 0.8));

    function withReason(rows, reasonFn) {
      return rows.map(function (c) {
        var copy = {};
        Object.keys(c).forEach(function (key) { copy[key] = c[key]; });
        copy.reason = reasonFn(c);
        return copy;
      });
    }

    var vip = withReason(customers.filter(function (c) {
      return c.revenue >= vipCutoff && c.orders >= 1;
    }).sort(function (a, b) { return b.revenue - a.revenue; }), function (c) {
      return 'הכנסה היסטורית גבוהה: ₪' + (typeof App !== 'undefined' ? App.fmtP(c.revenue) : c.revenue);
    });

    var loyal = withReason(customers.filter(function (c) {
      return c.orders >= 3 && c.daysSince <= 45;
    }).sort(function (a, b) { return b.orders - a.orders; }), function (c) {
      return c.orders + ' הזמנות והזמנה אחרונה לפני ' + c.daysSince + ' ימים';
    });

    var priceSensitive = withReason(customers.filter(function (c) {
      return c.orders >= 2 && avgUnit > 0 && c.avgUnitPrice < avgUnit * 0.9;
    }).sort(function (a, b) { return a.avgUnitPrice - b.avgUnitPrice; }), function (c) {
      return 'מחיר יחידה ממוצע נמוך מהממוצע הכללי';
    });

    var growing = withReason(customers.filter(function (c) {
      return c.currentRevenue > 0 && c.previousRevenue > 0 && c.currentRevenue >= c.previousRevenue * 1.25;
    }).sort(function (a, b) { return (b.currentRevenue - b.previousRevenue) - (a.currentRevenue - a.previousRevenue); }), function (c) {
      return 'צמיחה מול תקופה קודמת: ₪' + (typeof App !== 'undefined' ? App.fmtP(c.currentRevenue - c.previousRevenue) : (c.currentRevenue - c.previousRevenue));
    });

    var churnRisk = withReason(customers.filter(function (c) {
      return c.revenue >= avgRevenue && c.daysSince >= 30;
    }).sort(function (a, b) { return b.revenue - a.revenue; }), function (c) {
      return 'לקוח בעל ערך שלא הזמין ' + c.daysSince + ' ימים';
    });

    var sleepingHighValue = withReason(customers.filter(function (c) {
      return c.revenue >= avgRevenue * 1.2 && c.daysSince >= 60;
    }).sort(function (a, b) { return b.daysSince - a.daysSince; }), function (c) {
      return 'ערך גבוה היסטורית, שקט כבר ' + c.daysSince + ' ימים';
    });

    var newPromising = withReason(customers.filter(function (c) {
      return c.daysSinceFirst <= 30 && (c.revenue >= avgRevenue * 0.7 || c.orders >= 2);
    }).sort(function (a, b) { return b.revenue - a.revenue; }), function (c) {
      return 'לקוח חדש עם סימן ביקוש ראשוני';
    });

    return {
      customers: customers,
      avgRevenue: parseFloat(avgRevenue.toFixed(2)),
      avgUnitPrice: parseFloat(avgUnit.toFixed(2)),
      groups: {
        vip: group('VIP', vip, trust.customerDna),
        loyal: group('נאמנים', loyal, trust.customerDna),
        priceSensitive: group('רגישים למחיר', priceSensitive, trust.customerDna),
        growing: group('בצמיחה', growing, trust.customerDna),
        churnRisk: group('סיכון נטישה', churnRisk, trust.customerDna),
        sleepingHighValue: group('רדומים בעלי ערך', sleepingHighValue, trust.customerDna),
        newPromising: group('חדשים מבטיחים', newPromising, trust.customerDna)
      },
      formula: 'סיווג לקוחות לפי הכנסה, תדירות הזמנות, שינוי מול תקופה קודמת, מחיר יחידה ממוצע וימים מאז הזמנה אחרונה'
    };
  }

  return { build: build };
})();
