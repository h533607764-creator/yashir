'use strict';

var admin = require('firebase-admin');
var functions = require('firebase-functions');
var httpsV2 = require('firebase-functions/v2/https');
var pricing = require('./pricing');

admin.initializeApp();

var REGION = 'europe-west1'; /* keep in sync with src/firebase.js FUNCTIONS region */
var db = admin.firestore();
var CALLABLE_OPTIONS = {
  region: REGION,
  cors: ['https://yashir-dpab.vercel.app']
};

var PUBLIC_SETTINGS_FIELDS = [
  'minOrderAmount',
  'defaultShippingCost',
  'vatRate',
  'systemMessage',
  'systemMessage_en',
  'landingTitle',
  'landingTitle_en',
  'landingSubtitle',
  'landingSubtitle_en'
];

function pickPublicSettings(data) {
  var out = {};
  if (!data) return out;
  PUBLIC_SETTINGS_FIELDS.forEach(function (k) {
    if (data[k] !== undefined) out[k] = data[k];
  });
  return out;
}

function normalizedAdminPin(mainData) {
  var d = mainData || {};
  var raw = d.adminPin != null ? String(d.adminPin) : '';
  var trimmed = raw.trim();
  return trimmed !== '' ? trimmed : '1234';
}

function mergeSettings(mainData) {
  var d = mainData || {};
  return {
    minOrderAmount: typeof d.minOrderAmount === 'number' ? d.minOrderAmount : 300,
    defaultShippingCost: typeof d.defaultShippingCost === 'number' ? d.defaultShippingCost : 45,
    vatRate: typeof d.vatRate === 'number' ? d.vatRate : 0.18,
    nextOrderId:
      typeof d.nextOrderId === 'number' && !isNaN(d.nextOrderId) ? d.nextOrderId : 352436352,
    adminPin: normalizedAdminPin(d)
  };
}

function httpsError(code, message) {
  return new httpsV2.HttpsError(code, message || code);
}

function logCorsOrigin(request) {
  var origin = request && request.rawRequest && request.rawRequest.headers
    ? request.rawRequest.headers.origin
    : '';
  console.log('[CORS CHECK]', origin);
}

exports.authenticateCustomer = httpsV2.onCall(CALLABLE_OPTIONS, async function (request) {
  logCorsOrigin(request);
  var data = request.data || {};
  var hp = data && data.hp != null ? String(data.hp).trim() : '';
  var password = data && data.password != null ? String(data.password).trim() : '';
  if (!/^\d{5,12}$/.test(hp)) {
    throw httpsError('invalid-argument', 'INVALID_HP');
  }
  if (!password) {
    throw httpsError('permission-denied', 'AUTH_FAILED');
  }
  var snap = await db.collection('customers').doc(hp).get();
  if (!snap.exists) {
    throw httpsError('permission-denied', 'AUTH_FAILED');
  }
  var c = snap.data();
  c.hp = c.hp != null ? String(c.hp).trim() : hp;
  c.password = c.password != null ? String(c.password).trim() : '';
  if (c.id == null || String(c.id).trim() === '') c.id = c.hp;
  var reqPw = c.password;
  if (reqPw === '' || password !== reqPw) {
    throw httpsError('permission-denied', 'AUTH_FAILED');
  }
  var uid = 'cust_' + hp;
  var token = await admin.auth().createCustomToken(uid, {
    role: 'customer',
    customerId: hp
  });
  return { token: token, customer: c };
});

exports.authenticateAdmin = httpsV2.onCall(CALLABLE_OPTIONS, async function (request) {
  logCorsOrigin(request);
  var data = request.data || {};
  var pin =
    data && data.pin != null && String(data.pin).trim() !== '' ? String(data.pin).trim() : '';
  var mainSnap = await db.collection('app_settings').doc('main').get();
  var merged = mergeSettings(mainSnap.exists ? mainSnap.data() : {});
  if (pin !== merged.adminPin) {
    throw httpsError('permission-denied', 'AUTH_FAILED');
  }
  var token = await admin.auth().createCustomToken('admin_yashir', {
    role: 'admin',
    admin: true
  });
  return { token: token };
});

exports.ensurePublicAppSettings = httpsV2.onCall(CALLABLE_OPTIONS, async function (request) {
  logCorsOrigin(request);
  if (!request.auth || request.auth.token.admin !== true) {
    throw httpsError('permission-denied', 'ADMIN_ONLY');
  }
  var mainRef = db.collection('app_settings').doc('main');
  var pubRef = db.collection('app_settings').doc('public');
  var mainSnap = await mainRef.get();
  var pubSnap = await pubRef.get();
  if (pubSnap.exists) {
    return { ok: true, existed: true };
  }
  var payload = pickPublicSettings(mainSnap.exists ? mainSnap.data() : {});
  await pubRef.set(payload, { merge: true });
  return { ok: true, created: true };
});

exports.createOrder = httpsV2.onCall(CALLABLE_OPTIONS, async function (request) {
  logCorsOrigin(request);
  var data = request.data || {};
  if (!request.auth || !request.auth.token.customerId) {
    throw httpsError('unauthenticated', 'NEED_CUSTOMER_AUTH');
  }
  var customerId = String(request.auth.token.customerId);
  var lineItems = data && Array.isArray(data.lineItems) ? data.lineItems : [];
  var notes = data && data.notes != null ? String(data.notes).slice(0, 4e3) : '';

  if (!lineItems.length || lineItems.length > 80) {
    throw httpsError('invalid-argument', 'BAD_LINES');
  }

  var custSnap = await db.collection('customers').doc(customerId).get();
  if (!custSnap.exists) {
    throw httpsError('failed-precondition', 'CUSTOMER_MISSING');
  }
  var customer = custSnap.data();
  customer.hp = customer.hp != null ? String(customer.hp).trim() : customerId;
  customer.password = customer.password != null ? String(customer.password).trim() : '';
  if (customer.id == null || String(customer.id).trim() === '') customer.id = customer.hp;

  var mainSnap = await db.collection('app_settings').doc('main').get();
  var pubSnap = await db.collection('app_settings').doc('public').get();
  var mergedForPricing = Object.assign(
    {},
    pubSnap.exists ? pubSnap.data() : {},
    mainSnap.exists ? mainSnap.data() : {}
  );
  var eff = mergeSettings(mergedForPricing);

  var normalizedLines = [];
  for (var i = 0; i < lineItems.length; i++) {
    var row = lineItems[i] || {};
    var pid = row.productId != null ? String(row.productId) : '';
    if (!pid || pricing.SHIPPING_LINE_IDS[pid] || pricing.isShippingLineProduct({ id: pid })) {
      throw httpsError('invalid-argument', 'INVALID_PRODUCT');
    }
    var qty = parseInt(row.qty, 10);
    if (isNaN(qty) || qty < 1 || qty > 999) {
      throw httpsError('invalid-argument', 'BAD_QTY');
    }
    normalizedLines.push({ productId: pid, qty: qty });
  }

  var prodReads = await Promise.all(
    normalizedLines.map(function (L) {
      return db.collection('products').doc(L.productId).get();
    })
  );
  for (var pi0 = 0; pi0 < prodReads.length; pi0++) {
    if (!prodReads[pi0].exists) {
      throw httpsError('failed-precondition', 'PRODUCT_DOC_MISSING');
    }
  }

  var items = [];
  var cartSubtotal = 0;
  for (var k = 0; k < normalizedLines.length; k++) {
    var fresh = prodReads[k].data();
    var nq = normalizedLines[k].qty;
    var up = pricing.getEffectiveUnitPrice(fresh, customer, nq);
    if (up === null) {
      throw httpsError('failed-precondition', 'PRICING_ERROR');
    }
    var disc = pricing.getTotalDiscountPct(fresh, customer, nq);
    var stockSnap = typeof fresh.stock === 'number' && !isNaN(fresh.stock) ? fresh.stock : 0;
    items.push({
      product: JSON.parse(JSON.stringify(fresh)),
      qty: nq,
      unitPrice: up,
      discountPct: disc,
      outOfStock: nq > stockSnap
    });
    cartSubtotal += parseFloat((up * nq).toFixed(2));
  }
  cartSubtotal = parseFloat(cartSubtotal.toFixed(2));

  if (cartSubtotal < eff.minOrderAmount) {
    var sc = customer.shippingCost != null ? Number(customer.shippingCost) : eff.defaultShippingCost;
    if (isNaN(sc)) sc = eff.defaultShippingCost;
    var shipDoc = pricing.shippingProductDoc(sc);
    items.push({
      product: shipDoc,
      qty: 1,
      unitPrice: sc,
      discountPct: 0
    });
  }

  var totals = pricing.calcTotals(items, eff.vatRate);
  var tsIso = new Date().toISOString();
  var settingsRef = db.collection('app_settings').doc('main');

  try {
    var out = await db.runTransaction(async function (transaction) {
      var setSnap = await transaction.get(settingsRef);
      var d = setSnap.exists ? setSnap.data() : {};
      var seeded = 352436352;
      var curSeq =
        typeof d.nextOrderId === 'number' && !isNaN(d.nextOrderId) ? d.nextOrderId : seeded;

      var prodSnaps = [];
      for (var j = 0; j < normalizedLines.length; j++) {
        var pr = await transaction.get(db.collection('products').doc(normalizedLines[j].productId));
        prodSnaps.push(pr);
      }
      for (var pi = 0; pi < prodSnaps.length; pi++) {
        if (!prodSnaps[pi].exists) {
          throw new Error('PRODUCT_DOC_MISSING');
        }
      }

      var assignedNum = curSeq;
      var orderIdStr = String(assignedNum);

      var order = {
        id: orderIdStr,
        customerId: customer.hp,
        customerName: customer.name,
        customerName_en: customer.name_en || '',
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
        items: items,
        subtotal: totals.subtotal,
        vat: totals.vat,
        total: totals.total,
        savings: totals.savings,
        notes: notes,
        timestamp: tsIso,
        status: 'new',
        paymentStatus: 'unpaid'
      };

      transaction.set(settingsRef, { nextOrderId: assignedNum + 1 }, { merge: true });
      transaction.set(db.collection('orders').doc(orderIdStr), order);

      var fv = admin.firestore.FieldValue;
      for (var si = 0; si < normalizedLines.length; si++) {
        var pref = db.collection('products').doc(normalizedLines[si].productId);
        transaction.update(pref, { stock: fv.increment(-normalizedLines[si].qty) });
      }

      return { order: order, nextOrderId: assignedNum + 1 };
    });
    return out;
  } catch (e) {
    console.error('createOrder transaction', e);
    if (e && e.message === 'PRODUCT_DOC_MISSING') {
      throw httpsError('failed-precondition', 'PRODUCT_DOC_MISSING');
    }
    throw httpsError('internal', 'ORDER_FAILED');
  }
});
