var BICustomerIntelligenceModel = (function () {
  'use strict';

  function build(orders, filtered, nowMs) {
    var allMap = {};
    var periodMap = {};

    function addTo(map, o) {
      var key = String(o.customerId || o.customerName || 'unknown');
      var name = BIDataLoader.customerLabel(o.customerName || key) || key;
      if (!map[key]) map[key] = { key: key, name: name, revenue: 0, orders: 0, lastMs: 0 };
      map[key].orders += 1;
      map[key].lastMs = Math.max(map[key].lastMs, BIDataLoader.orderTimestampMs(o));
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        map[key].revenue += BIDataLoader.lineRevenue(item);
      });
    }

    orders.forEach(function (o) { addTo(allMap, o); });
    filtered.forEach(function (o) { addTo(periodMap, o); });

    function normalize(map) {
      return Object.keys(map).map(function (key) {
        map[key].revenue = parseFloat(map[key].revenue.toFixed(2));
        return map[key];
      });
    }

    var allCustomers = normalize(allMap);
    var periodCustomers = normalize(periodMap);
    var avgRevenue = allCustomers.length
      ? allCustomers.reduce(function (s, c) { return s + c.revenue; }, 0) / allCustomers.length
      : 0;
    var vip = periodCustomers.filter(function (c) {
      return c.revenue >= avgRevenue || c.orders >= 2;
    }).sort(function (a, b) {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.orders - a.orders;
    }).slice(0, 5);

    var churn = allCustomers.filter(function (c) {
      var daysSince = c.lastMs ? Math.floor((nowMs - c.lastMs) / 864e5) : 999;
      c.daysSince = daysSince;
      return c.revenue >= avgRevenue && daysSince >= 30;
    }).sort(function (a, b) {
      if (b.daysSince !== a.daysSince) return b.daysSince - a.daysSince;
      return b.revenue - a.revenue;
    }).slice(0, 5);

    return {
      vip: vip,
      churn: churn,
      customerCount: allCustomers.length,
      avgRevenue: parseFloat(avgRevenue.toFixed(2))
    };
  }

  return { build: build };
})();
