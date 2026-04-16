/**
 * Simulates malicious / unexpected client-side behavior against the ORDER pipeline.
 * Mirrors: cart → JSON clone → Pricing.calcTotals → persisted order shape (src/app.js).
 *
 * Run: node src/tests/order-malicious-simulation.cjs
 *
 * Real-world: DevTools, tampered localStorage, extensions, pasted JSON, double-tabs.
 */
'use strict';

var assert = require('assert');

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

/** Minimal product line as in a real cart item after clone */
function line(unitPrice, qty, listPrice) {
  return {
    unitPrice: unitPrice,
    qty: qty,
    discountPct: 0,
    product: { id: 'p1', price: listPrice, sku: 'S1', name: 'Item' }
  };
}

function run(title, fn) {
  try {
    fn();
    console.log('[PASS]', title);
  } catch (e) {
    console.error('[FAIL]', title, '-', e.message);
    throw e;
  }
}

console.log('\n=== Order system — client-side trust (no server re-price) ===\n');

run('Devtools: unitPrice tampered to 0.01 while list price 100 → subtotal near zero', function () {
  var t = calcTotalsMirror([line(0.01, 10, 100)], 0.18);
  assert.ok(t.subtotal < 1, 'expected near-zero charge, got ' + t.subtotal);
});

run('Negative unitPrice → negative subtotal / total (refund-style abuse)', function () {
  var t = calcTotalsMirror([line(-50, 2, 100)], 0.18);
  assert.ok(t.total < 0, 'negative total possible: ' + t.total);
});

run('Negative qty with positive price → negative line (cart restore trusts saved qty)', function () {
  var t = calcTotalsMirror([line(10, -3, 10)], 0.18);
  assert.ok(t.subtotal < 0);
});

run('Extreme qty from forged localStorage — absurd finite total (no server cap)', function () {
  var t = calcTotalsMirror([line(10, 1e15, 10)], 0.18);
  assert.ok(t.total > 1e14, 'client accepts astronomical charge: ' + t.total);
});

run('Infinity qty → non-finite totals', function () {
  var t = calcTotalsMirror([line(10, Infinity, 10)], 0.18);
  assert.ok(!Number.isFinite(t.total) || Number.isNaN(t.total));
});

run('NaN unitPrice after corrupt JSON → poisoned order totals', function () {
  var t = calcTotalsMirror([line(NaN, 1, 10)], 0.18);
  assert.ok(Number.isNaN(t.total));
});

console.log('\n=== Forged persisted orders (localStorage yashir_orders) ===\n');

run('Revenue sum uses o.total — attacker can inject huge total with empty items', function () {
  var orders = [{ id: 'fake-1', total: 1e15, subtotal: 1e15, vat: 0, timestamp: new Date().toISOString(), items: [] }];
  var revenue = orders.reduce(function (s, o) { return s + (o.total || 0); }, 0);
  assert.ok(revenue > 1e14);
});

run('Conflicting financials: items do not match declared total (admin confusion / fraud)', function () {
  var forged = {
    id: 'x',
    total: 10,
    subtotal: 10,
    vat: 0,
    items: [line(100, 99, 100)],
    timestamp: new Date().toISOString()
  };
  var recomputed = calcTotalsMirror(forged.items, 0.18);
  assert.notStrictEqual(recomputed.total, forged.total);
});

console.log('\n=== Notes / payload size (real user paste or bot) ===\n');

run('Megabyte order notes still stringify (memory / Firestore limits in prod)', function () {
  var notes = 'X'.repeat(600000);
  assert.ok(notes.length >= 600000);
  var order = { notes: notes, id: '1', total: 1 };
  var json = JSON.stringify(order);
  assert.ok(json.length >= 600000);
});

console.log('\n=== Identity / ID shape (Firestore vs string) ===\n');

run('Forged order with numeric customerId — strict checks elsewhere may skip', function () {
  var o = { customerId: 123456789, customerName: 'Victim', total: 0, items: [], timestamp: '' };
  var match = [{ id: '123456789' }].find(function (c) { return c.id === o.customerId; });
  assert.strictEqual(match, undefined);
});

console.log('\n=== Browser-only abuse (document in QA; not automated here) ===\n');
console.log([
  '• Console: App.state.cart[0].unitPrice = 0.01 then submit — order stored at penny prices.',
  '• Application → Local Storage → edit yashir_cart_<HP> JSON: qty 999999999, reload, submit.',
  '• Application → Local Storage → paste fake object into yashir_orders with negative total; open Admin → Stats.',
  '• Two windows: same customer, both submit within 1s — watch for duplicate orders or race.',
  '• Order notes: paste huge text / RTL control chars — ensure UI and print still respond.',
  '• Firestore rules: if orders are client-writable, attacker can write orders for other customerIds.'
].join('\n'));

console.log('\norder-malicious-simulation.cjs: all automated simulations completed.\n');
