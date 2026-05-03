'use strict';

var assert = require('assert');

function isProductLine(item) {
  var p = item && item.product ? item.product : {};
  return !(p.id === 'ship-1000' || p.category === 'shipping' || String(p.sku) === '1000');
}

function lineRevenue(item) {
  var qty = parseFloat(item && item.qty);
  var unitPrice = parseFloat(item && item.unitPrice);
  if (isNaN(qty) || isNaN(unitPrice)) return 0;
  return parseFloat((qty * unitPrice).toFixed(2));
}

function aggregate(orders) {
  var out = { revenue: 0, qty: 0, stockMovement: 0 };
  orders.forEach(function (o) {
    (o.items || []).forEach(function (item) {
      if (!isProductLine(item)) return;
      var qty = parseFloat(item.qty);
      if (isNaN(qty)) qty = 0;
      out.revenue += lineRevenue(item);
      out.qty += qty;
      out.stockMovement += qty;
    });
  });
  out.revenue = parseFloat(out.revenue.toFixed(2));
  out.qty = parseFloat(out.qty.toFixed(2));
  out.stockMovement = parseFloat(out.stockMovement.toFixed(2));
  return out;
}

function productBreakdown(orders) {
  var map = {};
  orders.forEach(function (o) {
    (o.items || []).forEach(function (item) {
      if (!isProductLine(item)) return;
      var p = item.product || {};
      var key = String(p.id || p.sku || p.name || 'unknown');
      if (!map[key]) map[key] = { key: key, qty: 0, revenue: 0 };
      map[key].qty += parseFloat(item.qty) || 0;
      map[key].revenue += lineRevenue(item);
    });
  });
  Object.keys(map).forEach(function (key) {
    map[key].qty = parseFloat(map[key].qty.toFixed(2));
    map[key].revenue = parseFloat(map[key].revenue.toFixed(2));
  });
  return map;
}

function dateKey(date, grain) {
  var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (grain === 'weekly') d.setDate(d.getDate() - d.getDay());
  if (grain === 'monthly') d = new Date(date.getFullYear(), date.getMonth(), 1);
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function series(orders, grain) {
  var map = {};
  orders.forEach(function (o) {
    var key = dateKey(new Date(o.timestamp), grain);
    if (!map[key]) map[key] = { label: key, revenue: 0, qty: 0 };
    (o.items || []).forEach(function (item) {
      if (!isProductLine(item)) return;
      map[key].revenue += lineRevenue(item);
      map[key].qty += parseFloat(item.qty) || 0;
    });
  });
  return Object.keys(map).sort().map(function (key) {
    map[key].revenue = parseFloat(map[key].revenue.toFixed(2));
    map[key].qty = parseFloat(map[key].qty.toFixed(2));
    return map[key];
  });
}

function run(name, fn) {
  fn();
  console.log('  OK', name);
}

var orders = [
  {
    id: 'o1',
    total: 999999,
    timestamp: '2026-05-01T09:00:00.000Z',
    items: [
      { product: { id: 'cup-001', sku: '1001' }, qty: 2, unitPrice: 10 },
      { product: { id: 'plt-001', sku: '2001' }, qty: 1, unitPrice: 7 },
      { product: { id: 'ship-1000', sku: '1000', category: 'shipping' }, qty: 1, unitPrice: 45 }
    ]
  },
  {
    id: 'o2',
    total: 1,
    timestamp: '2026-05-03T09:00:00.000Z',
    items: [
      { product: { id: 'cup-001', sku: '1001' }, qty: 3, unitPrice: 9.5 }
    ]
  }
];

console.log('\n=== BI dashboard analytics ===\n');

run('revenue is derived from order items, not order.total', function () {
  var sum = aggregate(orders);
  assert.strictEqual(sum.revenue, 55.5);
  assert.strictEqual(sum.qty, 6);
  assert.strictEqual(sum.stockMovement, 6);
});

run('top product breakdown matches aggregate totals', function () {
  var breakdown = productBreakdown(orders);
  var revenueTotal = Object.keys(breakdown).reduce(function (s, key) { return s + breakdown[key].revenue; }, 0);
  var qtyTotal = Object.keys(breakdown).reduce(function (s, key) { return s + breakdown[key].qty; }, 0);
  assert.strictEqual(parseFloat(revenueTotal.toFixed(2)), aggregate(orders).revenue);
  assert.strictEqual(parseFloat(qtyTotal.toFixed(2)), aggregate(orders).qty);
});

run('daily weekly and monthly time series use the same raw lines', function () {
  var weeklyRevenue = series(orders, 'weekly').reduce(function (s, row) { return s + row.revenue; }, 0);
  assert.strictEqual(series(orders, 'daily').length, 2);
  assert.strictEqual(parseFloat(weeklyRevenue.toFixed(2)), aggregate(orders).revenue);
  assert.strictEqual(series(orders, 'monthly')[0].qty, 6);
});

console.log('\nbi-dashboard-analytics.cjs: all automated checks passed.\n');
