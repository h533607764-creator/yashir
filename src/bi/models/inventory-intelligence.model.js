var BIInventoryIntelligenceModel = (function () {
  'use strict';

  function build(orders, filtered, range) {
    var allProducts = {};
    var periodProducts = {};

    function addProduct(map, item) {
      if (!BIDataLoader.isProductLine(item)) return;
      var p = item.product || {};
      var key = BIDataLoader.productKey(item);
      var qty = parseFloat(item.qty);
      if (isNaN(qty)) qty = 0;
      if (!map[key]) {
        map[key] = {
          key: key,
          sku: p.sku || '—',
          name: BIDataLoader.productName(item),
          qty: 0,
          revenue: 0,
          stock: typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : null
        };
      }
      map[key].qty += qty;
      map[key].revenue += BIDataLoader.lineRevenue(item);
      if (typeof p.stock === 'number' && !isNaN(p.stock)) map[key].stock = p.stock;
    }

    orders.forEach(function (o) {
      (o.items || []).forEach(function (item) { addProduct(allProducts, item); });
    });
    filtered.forEach(function (o) {
      (o.items || []).forEach(function (item) { addProduct(periodProducts, item); });
    });

    var days = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 864e5));
    var risks = Object.keys(periodProducts).map(function (key) {
      var ps = periodProducts[key];
      var dailySales = ps.qty / days;
      var stockDays = ps.stock !== null && dailySales > 0 ? ps.stock / dailySales : null;
      ps.qty = parseFloat(ps.qty.toFixed(2));
      ps.revenue = parseFloat(ps.revenue.toFixed(2));
      ps.dailySales = parseFloat(dailySales.toFixed(2));
      ps.stockDays = stockDays === null ? null : parseFloat(stockDays.toFixed(1));
      return ps;
    }).filter(function (ps) {
      return ps.stock !== null && ps.dailySales > 0 && ps.stockDays <= 14;
    }).sort(function (a, b) {
      return a.stockDays - b.stockDays;
    }).slice(0, 5);

    return {
      risks: risks,
      productsWithSales: Object.keys(periodProducts).length,
      productsWithStock: Object.keys(allProducts).filter(function (key) { return allProducts[key].stock !== null; }).length
    };
  }

  return { build: build };
})();
