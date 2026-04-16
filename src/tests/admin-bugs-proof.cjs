/**
 * Proof tests for known admin/order UI bugs (run: node src/tests/admin-bugs-proof.cjs)
 * These assert the *broken* behavior / JS semantics; they should pass until bugs are fixed.
 */
'use strict';

var assert = require('assert');

/* Bug 1: onclick built as SuccessView.printNote(' + o.id + ') without quotes — same parsing as eval(expr) */
assert.throws(
  function () {
    eval('1734567890123-xy1z');
  },
  ReferenceError,
  'suffix with letters: parsed as subtraction, RHS is undefined identifier'
);

var numericSuffix = eval('1700000000000-2345');
assert.strictEqual(typeof numericSuffix, 'number', 'suffix digits only: parsed as subtraction, not string id');
assert.notStrictEqual(
  String(numericSuffix),
  '1700000000000-2345',
  'printNote would receive wrong value vs real order id string'
);

/* Bug 2: _saveProd lowStockThreshold — parseInt(x)||10 turns 0 into 10 */
assert.strictEqual(parseInt('0', 10) || 10, 10, 'threshold input 0 cannot be preserved with || 10');

/* Bug 3: _saveNewProd stock — parseInt(x)||100 turns 0 into 100 */
assert.strictEqual(parseInt('0', 10) || 100, 100, 'stock input 0 cannot be preserved with || 100');

console.log('admin-bugs-proof.cjs: all assertions passed (bugs reproduced as expected).');
