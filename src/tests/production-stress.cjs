/**
 * Production-oriented stress & edge-case tests (Node, no DOM/Firebase).
 *
 * Run:
 *   node src/tests/admin-bugs-proof.cjs
 *   node src/tests/production-stress.cjs
 *
 * Maps to real user paths: cart/checkout, admin saves, catalog search,
 * Firestore-shaped data, rapid actions, bad/partial data.
 */
'use strict';

var assert = require('assert');

/* -------------------------------------------------------------------------- */
/* Mirror: App.Pricing.calcTotals (src/app.js) — same formula, isolated       */
/* -------------------------------------------------------------------------- */
function calcTotalsMirror(items, vatRate) {
  var subtotal = 0;
  var savings = 0;
  items.forEach(function (i) {
    var lineTotal = parseFloat((i.unitPrice * i.qty).toFixed(2));
    subtotal += lineTotal;
    var saved = parseFloat(((i.product.price - i.unitPrice) * i.qty).toFixed(2));
    if (saved > 0) savings += saved;
  });
  subtotal = parseFloat(subtotal.toFixed(2));
  var vat = parseFloat((subtotal * vatRate).toFixed(2));
  return {
    subtotal: subtotal,
    vat: vat,
    total: parseFloat((subtotal + vat).toFixed(2)),
    savings: parseFloat(savings.toFixed(2))
  };
}

/* Mirror: catalog search filter on name/sku (src/views/catalog.js) */
function catalogNameMatches(p, qLower) {
  return (
    p.name.toLowerCase().indexOf(qLower) > -1 ||
    (p.name_en || '').toLowerCase().indexOf(qLower) > -1 ||
    (p.sku || '').indexOf(qLower) > -1
  );
}

/* Mirror: admin stats monthly filter (src/views/admin.js) */
function orderInCurrentMonth(o, now) {
  var d = new Date(o.timestamp);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function run(name, fn) {
  var t0 = Date.now();
  try {
    fn();
    console.log('  OK', name, '(' + (Date.now() - t0) + 'ms)');
  } catch (e) {
    console.error('  FAIL', name, e.message);
    throw e;
  }
}

console.log('\n=== Regression: known JS/DOM string bugs (src/views/admin.js, etc.) ===\n');

run('unquoted order id in onclick — letter suffix throws at eval time', function () {
  assert.throws(function () { eval('1734567890123-xy1z'); }, ReferenceError);
});
run('unquoted order id — digit-only suffix becomes wrong number', function () {
  var n = eval('1700000000000-2345');
  assert.strictEqual(typeof n, 'number');
  assert.notStrictEqual(String(n), '1700000000000-2345');
});
run('lowStockThreshold parseInt||10 loses zero', function () {
  assert.strictEqual(parseInt('0', 10) || 10, 10);
});
run('new product stock parseInt||100 loses zero', function () {
  assert.strictEqual(parseInt('0', 10) || 100, 100);
});

console.log('\n=== Edge: cart totals & pricing (real corrupted / odd cart lines) ===\n');

run('calcTotals: missing product throws (stale localStorage / bad order)', function () {
  assert.throws(function () {
    calcTotalsMirror([{ unitPrice: 10, qty: 1, discountPct: 0 }], 0.18);
  });
});
run('calcTotals: NaN unitPrice poisons subtotal/total', function () {
  var r = calcTotalsMirror(
    [{ unitPrice: NaN, qty: 2, product: { price: 10 } }],
    0.18
  );
  assert.ok(Number.isNaN(r.subtotal) || Number.isNaN(r.total), 'expected NaN leakage in totals');
});
run('calcTotals: unitPrice undefined → NaN', function () {
  var r = calcTotalsMirror([{ qty: 1, product: { price: 10 } }], 0.18);
  assert.ok(Number.isNaN(r.subtotal));
});
run('calcTotals: huge qty stress (single line, still finite)', function () {
  var r = calcTotalsMirror([{ unitPrice: 99.99, qty: 999999, product: { price: 100 } }], 0.18);
  assert.ok(Number.isFinite(r.subtotal));
  assert.ok(Number.isFinite(r.total));
});

console.log('\n=== Edge: strict id match (Firestore vs string HP) ===\n');

run('order find fails when id types differ (printNote / lookups)', function () {
  var orders = [{ id: '123456789', total: 1 }];
  var byStrict = orders.find(function (o) { return o.id === 123456789; });
  assert.strictEqual(byStrict, undefined);
});

console.log('\n=== Edge: catalog search without name (Firestore bad row) ===\n');

run('catalog filter crashes if name is undefined', function () {
  assert.throws(function () {
    catalogNameMatches({ sku: '1' }, 'a');
  });
});

console.log('\n=== Edge: stats month filter with invalid / Firestore-like timestamp ===\n');

run('Invalid Date excludes order from monthly stats (silent data loss)', function () {
  var now = new Date(2026, 3, 15);
  var o = { timestamp: { seconds: 1700000000, nanoseconds: 0 } };
  assert.strictEqual(orderInCurrentMonth(o, now), false);
});
run('ISO string order is included when in same month', function () {
  var now = new Date(2026, 3, 15);
  var o = { timestamp: new Date(2026, 3, 10).toISOString() };
  assert.strictEqual(orderInCurrentMonth(o, now), true);
});

console.log('\n=== Stress: volume ( impatient user / huge cart ) ===\n');

run('calcTotals many lines (5000) completes under 3s and finite', function () {
  var items = [];
  for (var i = 0; i < 5000; i++) {
    items.push({ unitPrice: 1.11, qty: 2, product: { price: 2 } });
  }
  var t0 = Date.now();
  var r = calcTotalsMirror(items, 0.18);
  var elapsed = Date.now() - t0;
  assert.ok(elapsed < 3000, 'took ' + elapsed + 'ms');
  assert.ok(Number.isFinite(r.total) && r.total > 0);
});

run('rapid JSON clone stress (simulate Orders.submit stringify)', function () {
  var cart = [];
  for (var j = 0; j < 200; j++) {
    cart.push({
      product: { id: 'p' + j, price: 10, sku: 's' + j, name: 'N' },
      qty: 1,
      unitPrice: 9,
      discountPct: 0
    });
  }
  var t0 = Date.now();
  for (var k = 0; k < 500; k++) {
    JSON.parse(JSON.stringify(cart));
  }
  assert.ok(Date.now() - t0 < 5000, '500 stringify cycles too slow');
});

console.log('\n=== Manual checklist (run on staging / production in browser) ===\n');
console.log([
  '1. Orders: After placing order, open admin → View order → Print delivery note (modal button).',
  '2. Admin product: Edit product, set low-stock threshold to 0, save — verify stored value is 0 not 10.',
  '3. Admin product: Add product with stock 0 — verify saved stock is 0 not 100.',
  '4. Catalog: Open "request new product" modal, log out from header (other tab ok), submit — expect no crash.',
  '5. Catalog: Type in search with a product missing `name` in Firestore — expect graceful behavior.',
  '6. Cart: Throttle network to Slow 3G, spam +/- quantity then submit — watch for double-submit or wrong totals.',
  '7. Two tabs: Admin changes prices in tab A; customer tab B on catalog — refresh or wait for sync; verify prices.',
  '8. Mobile: Open cart sheet, rotate device, tap backdrop rapidly — modal/cart should not leave stuck overlay.',
  '9. Paste 9-digit HP with spaces/dashes in login — verify login still works or shows clear error.',
  '10. Firestore: Product doc missing `sku` — reload site with DB on; verify catalog/admin still usable.',
  '11. localStorage full (simulate in DevTools): try save settings / place order — should not white-screen.',
  '12. Print note with popup blocker on — expect toast, not silent failure.'
].join('\n'));

console.log('\nproduction-stress.cjs: all automated checks passed.\n');
