/* =============================================================
   ישיר — App Core v3 (i18n)
   ============================================================= */
var App = (function () {
  'use strict';

  /* ===== HELPERS ===== */
  function fmtP(n) {
    var r = Math.round(n * 100) / 100;
    if (r % 1 === 0) return String(Math.round(r));
    return r.toFixed(2).replace(/\.?0+$/, '');
  }

  function escHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function dateFmt(d) {
    var locale = I18n.getLang() === 'en' ? 'en-US' : 'he-IL';
    return new Date(d).toLocaleDateString(locale);
  }

  /* ===== STATE ===== */
  var state = {
    currentUser: null,
    currentView: 'landing',
    cart: [],
    cartOpen: false,
    settings: {
      minOrderAmount: 300,
      defaultShippingCost: 45,
      vatRate: 0.18,
      nextOrderId: 352436352,
      adminPin: '1234',
      systemMessage: 'ברוכים הבאים לישיר! הזמינו עד יום ג׳ לאספקה ביום ה׳.',
      landingTitle: 'רמה אחת מעל, דאגה אחת פחות',
      landingSubtitle: 'ישיר שיווק והפצה — מוצרים חד-פעמיים לעסקים ואירועים',
      systemMessage_en: '',
      landingTitle_en: '',
      landingSubtitle_en: ''
    }
  };

  /* ===== STORAGE ===== */
  var Store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('yashir_' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('yashir_' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { localStorage.removeItem('yashir_' + k); }
  };

  /* ===== LOAD PERSISTED DATA ===== */
  function loadData() {
    var s = Store.get('settings');
    if (s) {
      Object.assign(state.settings, s);
      if (state.settings.systemMessage_en === undefined) state.settings.systemMessage_en = '';
      if (state.settings.landingTitle_en === undefined) state.settings.landingTitle_en = '';
      if (state.settings.landingSubtitle_en === undefined) state.settings.landingSubtitle_en = '';
    }
    var c = Store.get('customers');
    if (c) window.CUSTOMERS_DB = c;
    var p = Store.get('products');
    if (p && p.length) {
      if (window.setYashirProductsList) window.setYashirProductsList(p);
      else window.PRODUCTS = p;
    }
    if (!Store.get('orders'))   Store.set('orders', []);
    if (!Store.get('expenses')) Store.set('expenses', []);

    var sixMonthsAgo = Date.now() - 180 * 864e5;
    var localOrders = Store.get('orders');
    if (localOrders && localOrders.length > 200) {
      var trimmed = localOrders.filter(function (o) {
        if (!o.timestamp) return true;
        var t = new Date(o.timestamp).getTime();
        if (isNaN(t)) return true;
        return t > sixMonthsAgo;
      });
      Store.set('orders', trimmed);
    }
  }

  /* ===== AUTH ===== */
  var Auth = {
    login: function (hp, remember) {
      var c = CUSTOMERS_DB.find(function (x) { return x.id === hp; });
      if (!c) return false;
      state.currentUser = { role: 'customer', customer: c };
      state.cart = [];
      Cart._restore();
      try { sessionStorage.setItem('yashir_sess_hp', hp); } catch (e) {}
      if (remember) Store.set('remember', { hp: hp, exp: Date.now() + 30 * 864e5 });
      return true;
    },
    loginAdmin: function (pin) {
      if (pin !== (state.settings.adminPin || ADMIN_CREDENTIALS.pin)) return false;
      state.currentUser = { role: 'admin' };
      state.cart = [];
      try { sessionStorage.setItem('yashir_sess_admin', '1'); } catch (e) {}
      return true;
    },
    logout: function () {
      _tearDownSecretAdmin();
      state.currentUser = null;
      state.cart = [];
      Store.del('remember');
      try {
        sessionStorage.removeItem('yashir_sess_hp');
        sessionStorage.removeItem('yashir_sess_admin');
        sessionStorage.removeItem('yashir_last_view');
        sessionStorage.removeItem('yashir_last_params');
        sessionStorage.removeItem('yashir_last_order_id');
        sessionStorage.removeItem('yashir_cat_section');
      } catch (e) {}
      closeCart();
      navigate('landing');
    },
    tryAuto: function () {
      var r = Store.get('remember');
      if (!r || Date.now() > r.exp) return false;
      return Auth.login(r.hp, false);
    },
    isGuest:    function () { return !state.currentUser; },
    isCustomer: function () { return !!(state.currentUser && state.currentUser.role === 'customer'); },
    isAdmin:    function () { return !!(state.currentUser && state.currentUser.role === 'admin'); }
  };

  /* ===== PRICING ===== */
  var Pricing = {
    getBulkDiscountPct: function (product, qty) {
      var discounts = product.bulkDiscounts;
      if (!discounts || !discounts.length || !qty || qty < 1) return 0;
      var best = 0;
      discounts.forEach(function (d) {
        if (qty >= d.minQty && d.discountPct > best) best = d.discountPct;
      });
      return best;
    },
    getNextBulkThreshold: function (product, qty) {
      var discounts = product.bulkDiscounts;
      if (!discounts || !discounts.length) return null;
      var sorted = discounts.slice().sort(function (a, b) { return a.minQty - b.minQty; });
      for (var i = 0; i < sorted.length; i++) {
        if (sorted[i].minQty > qty) return sorted[i];
      }
      return null;
    },
    getUnitPrice: function (product, customer) {
      if (!customer) return null;
      var p = customer.personalPrices && customer.personalPrices[product.id];
      if (p !== undefined) return p;
      if (customer.generalDiscount > 0) {
        return parseFloat((product.price * (1 - customer.generalDiscount / 100)).toFixed(2));
      }
      return product.price;
    },
    getEffectiveUnitPrice: function (product, customer, qty) {
      var basePrice = Pricing.getUnitPrice(product, customer);
      if (basePrice === null) return null;
      var bulkPct = Pricing.getBulkDiscountPct(product, qty);
      if (bulkPct > 0) {
        return parseFloat((basePrice * (1 - bulkPct / 100)).toFixed(2));
      }
      return basePrice;
    },
    getDiscountPct: function (product, customer) {
      if (!customer) return 0;
      var p = customer.personalPrices && customer.personalPrices[product.id];
      if (p !== undefined) {
        if (!product.price || product.price <= 0) return 0;
        return parseFloat(Math.max(0, (1 - p / product.price) * 100).toFixed(2));
      }
      return customer.generalDiscount || 0;
    },
    getTotalDiscountPct: function (product, customer, qty) {
      var personalPct = Pricing.getDiscountPct(product, customer);
      var bulkPct     = Pricing.getBulkDiscountPct(product, qty);
      if (personalPct === 0 && bulkPct === 0) return 0;
      if (!product.price || product.price <= 0) return 0;
      var effectivePrice = product.price * (1 - personalPct / 100) * (1 - bulkPct / 100);
      return parseFloat(Math.max(0, (1 - effectivePrice / product.price) * 100).toFixed(2));
    },
    hasPersonal: function (product, customer) {
      return !!(customer && customer.personalPrices && customer.personalPrices[product.id] !== undefined);
    },
    calcTotals: function (items) {
      var subtotal = 0, savings = 0;
      items.forEach(function (i) {
        var q = Number(i.qty);
        if (isNaN(q)) q = 0;
        var lineTotal = parseFloat((i.unitPrice * q).toFixed(2));
        subtotal += lineTotal;
        var listP = typeof i.product.price === 'number' && !isNaN(i.product.price) ? i.product.price : 0;
        var saved = parseFloat(((listP - i.unitPrice) * q).toFixed(2));
        if (saved > 0) savings += saved;
      });
      subtotal = parseFloat(subtotal.toFixed(2));
      var vat = parseFloat((subtotal * state.settings.vatRate).toFixed(2));
      return {
        subtotal: subtotal,
        vat: vat,
        total: parseFloat((subtotal + vat).toFixed(2)),
        savings: parseFloat(savings.toFixed(2))
      };
    },
    fmt: fmtP
  };

  /* Shipping row / stock UI — shared cart + checkout */
  function _isShippingLineProduct(p) {
    return !!(p && (p.id === 'ship-1000' || p.category === 'shipping'));
  }

  function _lineNeedsStockDelay(product, qty) {
    if (_isShippingLineProduct(product)) return false;
    var q = parseInt(qty, 10);
    if (isNaN(q) || q < 1) q = 1;
    var s = typeof product.stock === 'number' && !isNaN(product.stock) ? product.stock : 0;
    return q > s;
  }

  /* ===== CART ===== */
  var Cart = {
    add: function (product, qty) {
      if (!Auth.isCustomer()) { toast(t('catalog.loginFirst'), 'warning'); return; }
      qty = parseInt(qty, 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      qty = Math.min(999, qty);
      var customer = state.currentUser.customer;
      var zeroStock = product.stock <= 0;

      if (zeroStock) {
        toast(t('cart.oosToast'), 'warning');
      }

      var existing = state.cart.find(function (i) { return i.product.id === product.id; });
      if (existing) {
        existing.qty += qty;
        if (existing.qty > 999) existing.qty = 999;
        var newEffective = Pricing.getEffectiveUnitPrice(product, customer, existing.qty);
        if (newEffective !== null) existing.unitPrice = newEffective;
        existing.discountPct = Pricing.getTotalDiscountPct(product, customer, existing.qty);
        existing.outOfStock = _lineNeedsStockDelay(product, existing.qty);
      } else {
        var effectivePrice = Pricing.getEffectiveUnitPrice(product, customer, qty);
        var totalDisc      = Pricing.getTotalDiscountPct(product, customer, qty);
        state.cart.push({
          product:     product,
          qty:         qty,
          unitPrice:   effectivePrice !== null ? effectivePrice : product.price,
          discountPct: totalDisc,
          outOfStock:  _lineNeedsStockDelay(product, qty)
        });
      }

      Cart._save();
      Cart.updateBadge();
      toast(zeroStock ? t('cart.addedOos') : t('cart.addedToCart'), zeroStock ? 'warning' : 'success');
    },

    remove: function (id) {
      state.cart = state.cart.filter(function (i) { return i.product.id !== id; });
      Cart._save();
      Cart.updateBadge();
      if (state.cartOpen) CartView.renderPanel();
    },

    updateQty: function (id, qty) {
      qty = parseInt(qty, 10);
      if (isNaN(qty) || qty < 1) { Cart.remove(id); return; }
      qty = Math.min(999, qty);
      var item = state.cart.find(function (i) { return i.product.id === id; });
      if (item) {
        item.qty = qty;
        var customer = Auth.isCustomer() ? state.currentUser.customer : null;
        if (customer) {
          var newPrice = Pricing.getEffectiveUnitPrice(item.product, customer, qty);
          if (newPrice !== null) item.unitPrice = newPrice;
          item.discountPct = Pricing.getTotalDiscountPct(item.product, customer, qty);
        }
        item.outOfStock = _lineNeedsStockDelay(item.product, item.qty);
      }
      Cart._save();
      Cart.updateBadge();
      if (state.cartOpen) CartView.renderPanel();
    },

    clear: function () {
      state.cart = [];
      if (Auth.isCustomer()) Store.del('cart_' + state.currentUser.customer.id);
      Cart.updateBadge();
    },

    count: function () {
      return state.cart.reduce(function (s, i) {
        var q = parseInt(i.qty, 10);
        return s + (isNaN(q) || q < 0 ? 0 : q);
      }, 0);
    },
    subtotal: function () {
      return parseFloat(state.cart.reduce(function (s, i) {
        var q = Number(i.qty);
        if (isNaN(q)) q = 0;
        return s + i.unitPrice * q;
      }, 0).toFixed(2));
    },
    needsShipping: function () { return Cart.subtotal() < state.settings.minOrderAmount; },
    getShippingCost: function () {
      var c = state.currentUser && state.currentUser.customer;
      return c ? (c.shippingCost || state.settings.defaultShippingCost) : state.settings.defaultShippingCost;
    },
    hasOOS: function () {
      return state.cart.some(function (i) {
        return _lineNeedsStockDelay(i.product, i.qty);
      });
    },

    updateBadge: function () {
      var badge = document.getElementById('cart-badge');
      var fab = document.getElementById('cart-fab-btn');
      if (!badge) return;
      var n = Cart.count();
      badge.textContent = n;
      badge.style.display = n > 0 ? 'flex' : 'none';
      if (fab) fab.classList.toggle('has-items', n > 0);
    },

    _save: function () {
      if (!Auth.isCustomer()) return;
      var cid = state.currentUser.customer.id;
      Store.set('cart_' + cid, state.cart.map(function (i) {
        return { pid: i.product.id, qty: i.qty, unitPrice: i.unitPrice, discountPct: i.discountPct, outOfStock: i.outOfStock };
      }));
    },

    _restore: function () {
      if (!Auth.isCustomer()) return;
      var cid = state.currentUser.customer.id;
      var saved = Store.get('cart_' + cid);
      if (!saved || !saved.length) return;
      var customer = state.currentUser.customer;
      state.cart = saved.map(function (s) {
        var p = (window.PRODUCTS || []).find(function (x) { return x.id === s.pid; });
        if (!p) return null;
        var q = parseInt(s.qty, 10);
        if (isNaN(q) || q < 1) q = 1;
        q = Math.min(999, q);
        var freshPrice = Pricing.getEffectiveUnitPrice(p, customer, q);
        var freshDisc  = Pricing.getTotalDiscountPct(p, customer, q);
        return {
          product: p,
          qty: q,
          unitPrice: freshPrice !== null ? freshPrice : s.unitPrice,
          discountPct: freshDisc,
          outOfStock: _lineNeedsStockDelay(p, q)
        };
      }).filter(Boolean);
    },

    _repriceAll: function () {
      if (!Auth.isCustomer() || !state.cart.length) return;
      var customer = state.currentUser.customer;
      state.cart.forEach(function (item) {
        var fresh = (window.PRODUCTS || []).find(function (x) { return x.id === item.product.id; });
        if (fresh) item.product = fresh;
        var ep = Pricing.getEffectiveUnitPrice(item.product, customer, item.qty);
        if (ep !== null) item.unitPrice = ep;
        item.discountPct = Pricing.getTotalDiscountPct(item.product, customer, item.qty);
        item.outOfStock = _lineNeedsStockDelay(item.product, item.qty);
      });
      Cart._save();
      Cart.updateBadge();
      if (state.cartOpen && typeof CartView !== 'undefined' && CartView.renderPanel) CartView.renderPanel();
    }
  };

  /* ===== ORDERS ===== */
  var Orders = {
    submit: function (notes) {
      if (!Auth.isCustomer() || state.cart.length === 0) return;
      var customer = state.currentUser.customer;
      var PR = window.PRODUCTS || [];
      var PRICE_EPS = 0.02;

      for (var vi = 0; vi < state.cart.length; vi++) {
        var cl = state.cart[vi];
        var fr = PR.find(function (p) { return p.id === cl.product.id; });
        if (!fr) {
          toast(t('cart.productMissing'), 'error');
          return;
        }
        var exp = Pricing.getEffectiveUnitPrice(fr, customer, cl.qty);
        if (exp === null) {
          toast(t('cart.orderSaveFailed'), 'error');
          return;
        }
        if (Math.abs(exp - cl.unitPrice) > PRICE_EPS) {
          modalInfoPriceChange({ product: fr, oldPrice: cl.unitPrice, newPrice: exp }).then(function () {
            Cart._repriceAll();
          });
          return;
        }
      }

      var items = [];
      for (var j = 0; j < state.cart.length; j++) {
        var line = state.cart[j];
        var fresh = PR.find(function (p) { return p.id === line.product.id; });
        var q = parseInt(line.qty, 10);
        if (isNaN(q) || q < 1) q = 1;
        q = Math.min(999, q);
        var up = Pricing.getEffectiveUnitPrice(fresh, customer, q);
        var disc = Pricing.getTotalDiscountPct(fresh, customer, q);
        var stockSnap = typeof fresh.stock === 'number' && !isNaN(fresh.stock) ? fresh.stock : 0;
        items.push({
          product: JSON.parse(JSON.stringify(fresh)),
          qty: q,
          unitPrice: up,
          discountPct: disc,
          outOfStock: q > stockSnap
        });
      }
      if (Cart.needsShipping()) {
        var sc = Cart.getShippingCost();
        items.push({ product: Object.assign({}, SHIPPING_PRODUCT, { price: sc }), qty: 1, unitPrice: sc, discountPct: 0 });
      }
      var totals = Pricing.calcTotals(items);
      var tsIso = new Date(Date.now()).toISOString();

      function makeOrderPayload(orderIdStr) {
        var order = {
          id: orderIdStr,
          customerId: customer.id,
          customerName: customer.name,
          customerName_en: customer.name_en || '',
          customerPhone: customer.phone || '',
          customerEmail: customer.email || '',
          items: items,
          subtotal: totals.subtotal,
          vat: totals.vat,
          total: totals.total,
          savings: totals.savings,
          notes: notes || '',
          timestamp: tsIso,
          status: 'new',
          paymentStatus: 'unpaid'
        };
        if (!order.timestamp || isNaN(Date.parse(order.timestamp))) {
          order.timestamp = new Date(Date.now()).toISOString();
        }
        return order;
      }

      function persistLocalAndFinish(order) {
        var all = Store.get('orders') || [];
        all.unshift(order);
        Store.set('orders', all);
        Store.set('settings', state.settings);
        Cart.clear();
        closeCart();
        navigate('success', { order: order });
      }

      function applyLocalStockFromCart() {
        state.cart.forEach(function (line) {
          if (_isShippingLineProduct(line.product)) return;
          var p = PR.find(function (x) { return x.id === line.product.id; });
          if (!p) return;
          var dq = parseInt(line.qty, 10);
          if (isNaN(dq) || dq < 1) dq = 1;
          p.stock = (Number(p.stock) || 0) - dq;
        });
        try { Store.set('products', window.PRODUCTS); } catch (e0) {}
      }

      if (!window.DB) {
        var nextLocal =
          typeof state.settings.nextOrderId === 'number' && !isNaN(state.settings.nextOrderId)
            ? state.settings.nextOrderId
            : 352436352;
        var oidLoc = String(nextLocal);
        state.settings.nextOrderId = nextLocal + 1;
        applyLocalStockFromCart();
        persistLocalAndFinish(makeOrderPayload(oidLoc));
        return;
      }

      var dbRef = window.DB;
      var settingsRef = dbRef.collection('app_settings').doc('main');
      var fv = firebase.firestore.FieldValue;
      var cartLinesForStock = [];
      state.cart.forEach(function (line) {
        if (!_isShippingLineProduct(line.product)) cartLinesForStock.push(line);
      });

      dbRef
        .runTransaction(function (transaction) {
          return transaction.get(settingsRef).then(function (setSnap) {
            var d = setSnap.exists ? setSnap.data() : {};
            var seeded =
              typeof state.settings.nextOrderId === 'number' && !isNaN(state.settings.nextOrderId)
                ? state.settings.nextOrderId
                : 352436352;
            var curSeq =
              typeof d.nextOrderId === 'number' && !isNaN(d.nextOrderId)
                ? d.nextOrderId
                : seeded;
            if (curSeq < seeded) curSeq = seeded;

            function readProdSnaps(idx, acc) {
              if (idx >= cartLinesForStock.length) return Promise.resolve(acc);
              return transaction
                .get(dbRef.collection('products').doc(cartLinesForStock[idx].product.id))
                .then(function (snap) {
                  acc.push(snap);
                  return readProdSnaps(idx + 1, acc);
                });
            }

            return readProdSnaps(0, []).then(function (prodSnaps) {
              var pi;
              for (pi = 0; pi < prodSnaps.length; pi++) {
                if (!prodSnaps[pi].exists) throw new Error('PRODUCT_DOC_MISSING');
              }

              var assignedNum = curSeq;
              var orderIdStr = String(assignedNum);
              var orderPayload = makeOrderPayload(orderIdStr);

              transaction.set(settingsRef, { nextOrderId: assignedNum + 1 }, { merge: true });
              transaction.set(dbRef.collection('orders').doc(orderIdStr), orderPayload);

              for (pi = 0; pi < cartLinesForStock.length; pi++) {
                var dq = parseInt(cartLinesForStock[pi].qty, 10);
                if (isNaN(dq) || dq < 1) dq = 1;
                var pref = dbRef.collection('products').doc(cartLinesForStock[pi].product.id);
                transaction.update(pref, { stock: fv.increment(-dq) });
              }

              return assignedNum + 1;
            });
          });
        })
        .then(function (nextCounter) {
          state.settings.nextOrderId = nextCounter;
          try {
            Store.set('settings', state.settings);
          } catch (e1) {}
          if (window.DBSync) DBSync.saveSettings(state.settings);
          /* Stock: rely on Firestore products onSnapshot — do not deduct locally here (avoids double decrement). */
          persistLocalAndFinish(makeOrderPayload(String(nextCounter - 1)));
        })
        .catch(function (e) {
          console.warn('Firestore order transaction:', e);
          if (e && e.message === 'PRODUCT_DOC_MISSING') {
            toast(t('cart.productMissing'), 'error');
          } else {
            toast(t('cart.orderSaveFailed'), 'error');
          }
        });
    },

    getAll: function () { return Store.get('orders') || []; },

    updateStatus: function (orderId, newStatus, customerPhone) {
      var all = Store.get('orders') || [];
      var o = all.find(function (x) { return String(x.id) === String(orderId); });
      if (o) { o.status = newStatus; Store.set('orders', all); }
      if (window.DB) {
        window.DB.collection('orders').doc(String(orderId)).update({ status: newStatus })
          .catch(function (e) { console.warn('status update error:', e); });
      }
    },

    updatePayment: function (orderId, paymentStatus) {
      var all = Store.get('orders') || [];
      var o = all.find(function (x) { return String(x.id) === String(orderId); });
      if (o) { o.paymentStatus = paymentStatus; Store.set('orders', all); }
      if (window.DB) {
        window.DB.collection('orders').doc(String(orderId)).update({ paymentStatus: paymentStatus })
          .catch(function (e) { console.warn('payment update error:', e); });
      }
    }
  };

  /* ===== ROUTING ===== */
  function persistRoute(view, params) {
    try {
      sessionStorage.setItem('yashir_last_view', view);
      if (view === 'success' && params && params.order && params.order.id) {
        sessionStorage.setItem('yashir_last_order_id', String(params.order.id));
        sessionStorage.setItem('yashir_last_params', '{}');
      } else {
        sessionStorage.removeItem('yashir_last_order_id');
        var pp = {};
        if (params) {
          Object.keys(params).forEach(function (k) {
            if (k !== 'order') pp[k] = params[k];
          });
        }
        sessionStorage.setItem('yashir_last_params', JSON.stringify(pp));
      }
    } catch (e) {}
  }

  function restoreSession() {
    if (state.currentUser) return;
    if (Auth.tryAuto()) return;
    try {
      var hp = sessionStorage.getItem('yashir_sess_hp');
      if (hp && typeof CUSTOMERS_DB !== 'undefined' && CUSTOMERS_DB.some(function (x) { return x.id === hp; })) {
        Auth.login(hp, false);
        return;
      }
      if (sessionStorage.getItem('yashir_sess_admin') === '1') {
        state.currentUser = { role: 'admin' };
        state.cart = [];
      }
    } catch (e) {}
  }

  function restoreRoute() {
    var view = 'landing';
    try { view = sessionStorage.getItem('yashir_last_view') || 'landing'; } catch (e1) {}
    var params = {};
    try { params = JSON.parse(sessionStorage.getItem('yashir_last_params') || '{}'); } catch (e2) {}
    if (view === 'admin' && !Auth.isAdmin()) view = 'landing';
    if ((view === 'catalog' || view === 'success' || view === 'admin') && Auth.isGuest()) view = 'landing';
    if (view === 'success') {
      var oid = sessionStorage.getItem('yashir_last_order_id');
      var order = null;
      if (oid) {
        var all = Store.get('orders') || [];
        order = all.find(function (o) { return String(o.id) === String(oid); });
      }
      if (order) params = { order: order };
      else {
        view = Auth.isCustomer() ? 'catalog' : 'landing';
        params = {};
      }
    }
    navigate(view, params);
  }

  function navigate(view, params) {
    if (state.currentView === 'admin' && view !== 'admin' && window.AdminView && AdminView._ordersUnsub) {
      AdminView._ordersUnsub(); AdminView._ordersUnsub = null;
    }
    state.currentView = view;
    params = params || {};
    window.scrollTo(0, 0);
    renderHeader();
    updateFloatBtns();
    var el = document.getElementById('view-content');
    if (!el) return;
    switch (view) {
      case 'landing':  LandingView.render(el); break;
      case 'login':    LoginView.render(el); break;
      case 'catalog': {
        var catParams = params || {};
        if (!catParams.section) {
          try {
            var sec = sessionStorage.getItem('yashir_cat_section');
            if (sec === 'full' || sec === 'personal') catParams.section = sec;
          } catch (e3) {}
        }
        CatalogView.render(el, catParams);
        persistRoute('catalog', catParams);
        return;
      }
      case 'success':  SuccessView.render(el, params); break;
      case 'admin':
        if (!Auth.isAdmin()) {
          navigate('landing');
          return;
        }
        AdminView.render(el, params);
        break;
      default:         LandingView.render(el);
    }
    persistRoute(view, params);
  }

  /* ===== HEADER ===== */
  function renderHeader() {
    var h = document.getElementById('site-header');
    if (!h) return;

    var user = '';
    if (Auth.isAdmin()) {
      user = '<div class="header-user">' +
        '<span class="header-role admin-badge"><span class="material-icons-round" style="font-size:16px">admin_panel_settings</span> ' + t('header.admin') + '</span>' +
        '<button class="btn-admin-panel" onclick="App.navigate(\'admin\')">' + t('header.adminPanel') + '</button>' +
        '<button class="btn-logout" onclick="App.Auth.logout()"><span class="material-icons-round" style="font-size:18px">logout</span></button>' +
        '</div>';
    } else if (Auth.isCustomer()) {
      user = '<div class="header-user">' +
        '<span class="header-welcome">' + t('header.hello') + '<strong>' + escHTML(pLang(state.currentUser.customer, 'name')) + '</strong></span>' +
        '<button class="btn-logout orange" onclick="App.Auth.logout()">' + t('header.logout') + '</button>' +
        '</div>';
    } else {
      user = '<div class="header-user">' +
        '<button class="btn-login-header" onclick="App.navigate(\'login\')">' + t('header.login') + '</button>' +
        '</div>';
    }
    h.innerHTML = '<div class="container header-inner">' +
      '<div class="logo" onclick="App._logoClick()" style="cursor:pointer">' +
        '<div class="logo-mark">' + t('header.logoMark') + '</div>' +
        '<div class="logo-text-wrap"><span class="logo-name">' + t('header.logoName') + '</span><span class="logo-tagline">' + t('header.logoTagline') + '</span></div>' +
      '</div>' + user + '</div>';
    renderCartFab();
  }

  function renderCartFab() {
    var wrap = document.getElementById('cart-fab-wrap');
    if (!wrap) return;
    if (!Auth.isCustomer()) { wrap.innerHTML = ''; return; }
    var n = Cart.count();
    wrap.innerHTML = '<button id="cart-fab-btn" class="cart-fab' + (n > 0 ? ' has-items' : '') + '" onclick="App.toggleCart()" aria-label="' + t('header.cart') + '">' +
      '<span class="material-icons-round" style="font-size:26px">shopping_cart</span>' +
      '<span id="cart-badge" style="display:' + (n > 0 ? 'flex' : 'none') + '">' + n + '</span></button>';
  }

  /* ===== LANGUAGE SELECTOR ===== */
  function showLangSelector() {
    var isRemembered = I18n.isRemembered();
    var curLang = I18n.getLang();
    showModal(
      '<div class="sys-message">' +
        '<div class="sys-icon"><span class="material-icons-round" style="font-size:30px">translate</span></div>' +
        '<h3>' + t('lang.title') + '</h3>' +
        '<div style="display:flex;flex-direction:column;gap:12px;width:100%;margin-top:12px">' +
          '<button id="lang-btn-he" class="btn-lang-option' + (curLang === 'he' ? ' active' : '') + '" onclick="App._selectLang(\'he\')">' +
            '<span style="font-size:20px">🇮🇱</span> <span>' + t('lang.hebrew') + '</span>' +
          '</button>' +
          '<button id="lang-btn-en" class="btn-lang-option' + (curLang === 'en' ? ' active' : '') + '" onclick="App._selectLang(\'en\')">' +
            '<span style="font-size:20px">🇬🇧</span> <span>' + t('lang.english') + '</span>' +
          '</button>' +
          '<label class="checkbox-label" style="margin-top:8px"><input type="checkbox" id="lang-remember"' + (isRemembered ? ' checked' : '') + '> ' +
            t('lang.remember') + '</label>' +
          '<button class="btn-primary full-width" onclick="App._confirmLang()">' +
            '<span class="material-icons-round">check</span> ' + t('lang.save') +
          '</button>' +
        '</div>' +
      '</div>'
    );
    App._pendingLang = curLang;
  }

  var _pendingLang = 'he';

  function _selectLang(lang) {
    _pendingLang = lang;
    var heBtn = document.getElementById('lang-btn-he');
    var enBtn = document.getElementById('lang-btn-en');
    if (heBtn) heBtn.classList.toggle('active', lang === 'he');
    if (enBtn) enBtn.classList.toggle('active', lang === 'en');
  }

  function _confirmLang() {
    var remember = document.getElementById('lang-remember');
    var rem = remember ? remember.checked : false;
    I18n.setLang(_pendingLang, rem);
    closeModal();
    renderHeader();
    updateFloatBtns();
    var el = document.getElementById('view-content');
    if (el) {
      switch (state.currentView) {
        case 'landing':  LandingView.render(el); break;
        case 'login':    LoginView.render(el); break;
        case 'catalog': {
          var _cpLang = {};
          try {
            var _sLang = sessionStorage.getItem('yashir_cat_section');
            if (_sLang === 'full' || _sLang === 'personal') _cpLang.section = _sLang;
          } catch (_eLang) {}
          CatalogView.render(el, _cpLang);
          break;
        }
        case 'success':  SuccessView.render(el); break;
        case 'admin':    AdminView.render(el); break;
      }
    }
    if (state.cartOpen) CartView.renderPanel();
  }

  /* ===== FLOATING BUTTONS ===== */
  function updateFloatBtns() {
    var wrap = document.getElementById('floating-btns');
    if (!wrap) return;

    var homeBtn =
      '<button type="button" class="float-btn float-home-btn" onclick="App.goHome()">' +
        '<span class="material-icons-round">home</span><span class="float-btn-text">' + t('float.home') + '</span>' +
      '</button>';

    if (state.currentView === 'landing') {
      wrap.innerHTML =
        homeBtn +
        '<button type="button" class="float-btn order-btn" onclick="App.startOrder()">' +
          '<span class="material-icons-round">shopping_bag</span><span class="float-btn-text">' + t('float.startOrder') + '</span>' +
        '</button>' +
        '<button type="button" class="float-btn catalog-btn" onclick="App.navigate(\'catalog\')">' +
          '<span class="material-icons-round">menu_book</span><span class="float-btn-text">' + t('float.catalog') + '</span>' +
        '</button>';
    } else if (state.currentView === 'catalog' && Auth.isCustomer()) {
      wrap.innerHTML =
        homeBtn +
        '<button type="button" class="float-btn request-btn" onclick="CatalogView.requestNewProduct()">' +
          '<span class="material-icons-round">add_circle</span><span class="float-btn-text">' + t('float.requestProduct') + '</span>' +
        '</button>' +
        '<button type="button" class="float-btn catalog-btn" onclick="CatalogView.goFullCatalog()">' +
          '<span class="material-icons-round">menu_book</span><span class="float-btn-text">' + t('float.fullCatalog') + '</span>' +
        '</button>';
    } else {
      wrap.innerHTML = homeBtn;
    }
  }

  /* ===== CART PANEL ===== */
  function toggleCart() { state.cartOpen ? closeCart() : openCart(); }
  function openCart() {
    state.cartOpen = true;
    document.getElementById('cart-panel').classList.remove('hidden');
    document.getElementById('overlay-backdrop').classList.remove('hidden');
    CartView.renderPanel();
  }
  function closeCart() {
    state.cartOpen = false;
    document.getElementById('cart-panel').classList.add('hidden');
    if (document.getElementById('modal-wrap').classList.contains('hidden')) {
      document.getElementById('overlay-backdrop').classList.add('hidden');
    }
  }

  /* ===== MODAL ===== */
  function showModal(html, opts) {
    opts = opts || {};
    var wrap = document.getElementById('modal-wrap');
    var bd   = document.getElementById('overlay-backdrop');
    var closeAttr = opts.priceAckClose ? 'App._priceChangeAckDone()' : 'App.closeModal()';
    wrap.innerHTML = '<div class="modal-box"><button type="button" class="modal-close" onclick="' + closeAttr + '"><span class="material-icons-round">close</span></button>' + html + '</div>';
    wrap.classList.remove('hidden');
    bd.classList.remove('hidden');
  }
  function _hideModalLayer() {
    document.getElementById('modal-wrap').classList.add('hidden');
    if (!state.cartOpen) document.getElementById('overlay-backdrop').classList.add('hidden');
  }

  var _priceChangeAckResolve = null;

  /** Mandatory acknowledgement: X / backdrop / button all continue (no reject). Resolves when dismissed. */
  function modalInfoPriceChange(payload) {
    var product = payload && payload.product;
    var oldPrice = payload && payload.oldPrice;
    var newPrice = payload && payload.newPrice;
    return new Promise(function (resolve) {
      _priceChangeAckResolve = resolve;
      var name = pLang(product, 'name') || '—';
      var oldNum = typeof oldPrice === 'number' ? oldPrice : parseFloat(oldPrice);
      var newNum = typeof newPrice === 'number' ? newPrice : parseFloat(newPrice);
      if (Number.isNaN(oldNum)) oldNum = 0;
      if (Number.isNaN(newNum)) newNum = 0;
      var diff = newNum - oldNum;
      var diffSign = diff >= 0 ? '+' : '−';
      var diffBody = diffSign + '₪' + fmtP(Math.abs(diff));
      showModal(
        '<div class="sys-message">' +
          '<h3 style="margin-top:0">' + escHTML(t('cart.priceAckTitle')) + '</h3>' +
          '<div style="width:100%;line-height:1.65;font-size:15px;margin-bottom:16px">' +
            '<p style="margin:8px 0"><strong>' + escHTML(t('cart.priceAckProduct')) + '</strong> ' + escHTML(name) + '</p>' +
            '<p style="margin:8px 0"><strong>' + escHTML(t('cart.priceAckOld')) + '</strong> ₪' + fmtP(oldNum) + '</p>' +
            '<p style="margin:8px 0"><strong>' + escHTML(t('cart.priceAckNew')) + '</strong> ₪' + fmtP(newNum) + '</p>' +
            '<p style="margin:8px 0"><strong>' + escHTML(t('cart.priceAckDiff')) + '</strong> ' + escHTML(diffBody) + '</p>' +
          '</div>' +
          '<button type="button" class="btn-primary full-width" onclick="App._priceChangeAckDone()">' + escHTML(t('cart.priceAckContinue')) + '</button>' +
        '</div>',
        { priceAckClose: true }
      );
    });
  }

  function _priceChangeAckDone() {
    var r = _priceChangeAckResolve;
    _priceChangeAckResolve = null;
    _hideModalLayer();
    if (r) r();
  }

  function closeModal() {
    if (_priceChangeAckResolve) {
      _priceChangeAckDone();
      return;
    }
    _hideModalLayer();
  }

  var Modal = { infoPriceChange: modalInfoPriceChange };

  /* ===== TOAST ===== */
  function toast(msg, type) {
    var wrap = document.getElementById('toast-wrap');
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { if (wrap.contains(el)) wrap.removeChild(el); }, 400);
    }, 3200);
  }

  function orderCustomerDisplay(o) {
    if (!o) return '';
    if (I18n.getLang() === 'en') {
      if (o.customerName_en) return o.customerName_en;
      if (o.customerId && typeof CUSTOMERS_DB !== 'undefined') {
        var cu = CUSTOMERS_DB.find(function (x) { return String(x.id) === String(o.customerId); });
        if (cu && cu.name_en) return cu.name_en;
      }
    }
    return o.customerName || '';
  }

  /* ===== SYSTEM MESSAGES ===== */
  function showSystemMsg() {
    var msg = pLang(state.settings, 'systemMessage');
    if (!msg) return;
    var hashSrc = state.settings.systemMessage || '';
    var hash = 0; for (var i = 0; i < hashSrc.length; i++) { hash = ((hash << 5) - hash + hashSrc.charCodeAt(i)) & 0x7fffffff; }
    var key = 'sysmsg_' + hash;
    if (Store.get(key)) return;
    showModal('<div class="sys-message">' +
      '<div class="sys-icon"><span class="material-icons-round" style="font-size:30px">campaign</span></div>' +
      '<h3>' + t('sys.title') + '</h3><p>' + escHTML(msg) + '</p>' +
      '<button class="btn-primary full-width" onclick="App.closeModal()">' + t('sys.understood') + '</button></div>');
    Store.set(key, 1);
  }

  function startOrder() {
    if (!Auth.isCustomer()) { navigate('login'); return; }
    navigate('catalog');
  }

  /* ===== SECRET ADMIN LOGIN (5× logo click within 2.5s) ===== */
  var LOGO_SECRET_WINDOW_MS = 2500;
  var _logoClickTimes = [];
  var _logoTimer  = null;
  var _secretAdminAwayHandler = null;

  function goHome() {
    Auth.logout();
  }

  function _tearDownSecretAdmin() {
    var box = document.getElementById('secret-admin');
    if (box) box.remove();
    if (_secretAdminAwayHandler) {
      document.removeEventListener('click', _secretAdminAwayHandler, true);
      _secretAdminAwayHandler = null;
    }
  }

  function _logoClick() {
    var now = Date.now();
    _logoClickTimes.push(now);
    _logoClickTimes = _logoClickTimes.filter(function (t) { return now - t <= LOGO_SECRET_WINDOW_MS; });
    clearTimeout(_logoTimer);
    _logoTimer = setTimeout(function () { _logoClickTimes = []; }, LOGO_SECRET_WINDOW_MS);
    if (_logoClickTimes.length >= 5) {
      _logoClickTimes = [];
      clearTimeout(_logoTimer);
      _showSecretAdmin();
      return;
    }
    navigate('landing');
  }

  function _showSecretAdmin() {
    _tearDownSecretAdmin();
    var el = document.createElement('div');
    el.id = 'secret-admin';
    el.innerHTML =
      '<p style="font-size:12px;color:var(--text-muted);text-align:center;margin:0">' + t('sys.adminAccess') + '</p>' +
      '<input type="password" id="sec-pin" placeholder="' + t('sys.accessCode') + '" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;padding:11px 14px;color:var(--text);font-family:inherit;font-size:16px;text-align:center;width:100%">' +
      '<button onclick="App._secretLogin()" style="background:var(--orange);color:#fff;border-radius:8px;padding:12px;font-weight:800;font-family:inherit;font-size:15px;cursor:pointer;border:none;width:100%">' + t('header.login') + '</button>';
    el.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:600;' +
      'background:var(--navy-mid);border:1px solid var(--border);border-radius:14px;' +
      'padding:20px;box-shadow:0 8px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:12px;min-width:260px;max-width:90vw';
    document.body.appendChild(el);
    setTimeout(function () {
      var p = document.getElementById('sec-pin');
      if (p) { p.focus(); p.addEventListener('keydown', function (e) { if (e.key === 'Enter') _secretLogin(); }); }
    }, 50);
    setTimeout(function () {
      _secretAdminAwayHandler = function (e) {
        var box = document.getElementById('secret-admin');
        if (box && !box.contains(e.target)) _tearDownSecretAdmin();
      };
      document.addEventListener('click', _secretAdminAwayHandler, true);
    }, 200);
  }

  function _secretLogin() {
    var pin = document.getElementById('sec-pin');
    if (!pin) return;
    if (Auth.loginAdmin(pin.value)) {
      _tearDownSecretAdmin();
      renderHeader();
      navigate('admin');
    } else {
      toast(t('sys.wrongCode'), 'error');
      pin.value = ''; pin.focus();
    }
  }

  /* ===== LOW STOCK ALERT ===== */
  function checkLowStock(product) {
    var threshold = product.lowStockThreshold != null ? product.lowStockThreshold : 10;
    if (product.stock > 0 && product.stock <= threshold) {
      showModal(
        '<div class="sys-message">' +
          '<div class="sys-icon" style="background:var(--orange-dim);color:var(--orange)"><span class="material-icons-round" style="font-size:30px">warning_amber</span></div>' +
          '<h3>' + t('sys.lowStockTitle') + '</h3>' +
          '<p><strong>' + escHTML(pLang(product, 'name')) + '</strong> — ' + t('sys.lowStockMsg') + ' <strong>' + product.stock + '</strong> ' + t('sys.unitsOnly') + '</p>' +
          '<button class="btn-primary full-width" onclick="App.closeModal()">' + t('common.close') + '</button>' +
        '</div>'
      );
    }
  }

  /** Cart lines where unitPrice !== getEffectiveUnitPrice (system price). */
  function getCartDriftLines() {
    var out = [];
    if (!Auth.isCustomer() || !state.cart.length) return out;
    var prevCartPrices = {};
    state.cart.forEach(function (item) {
      if (item.product && item.product.id) prevCartPrices[item.product.id] = item.unitPrice;
    });
    var customer = state.currentUser.customer;
    var PR = window.PRODUCTS || [];
    if (!PR.length) return out;
    var threshold = 0.01;
    for (var i = 0; i < state.cart.length; i++) {
      var item = state.cart[i];
      var pid = item.product && item.product.id;
      if (!pid) continue;
      var p = PR.find(function (x) { return x.id === pid; });
      if (!p) continue;
      var q = parseInt(item.qty, 10);
      if (isNaN(q) || q < 1) q = 1;
      q = Math.min(999, q);
      var ep = Pricing.getEffectiveUnitPrice(p, customer, q);
      if (ep === null) continue;
      var rawPrev = prevCartPrices[pid];
      if (rawPrev === undefined) continue;
      var prevNum =
        typeof rawPrev === 'number' && !Number.isNaN(rawPrev)
          ? rawPrev
          : parseFloat(rawPrev != null ? String(rawPrev).replace(',', '.') : '0');
      if (Number.isNaN(prevNum)) prevNum = 0;
      if (Math.abs(prevNum - ep) > threshold) {
        out.push({ product: p, oldPrice: prevNum, newPrice: ep });
      }
    }
    return out;
  }

  function hasCartLineDriftVersusEffectivePricing() {
    return getCartDriftLines().length > 0;
  }

  var _cartRepricePromptPromise = null;

  /**
   * After Firestore/customer pricing changes: reprice immediately if cart matches system prices;
   * otherwise show mandatory acknowledgement (per drift line), then always Cart._repriceAll().
   */
  function maybeRepriceCartAfterPricingChange() {
    if (!Auth.isCustomer() || !state.cart.length) {
      Cart._repriceAll();
      return Promise.resolve();
    }
    var drifts = getCartDriftLines();
    if (!drifts.length) {
      Cart._repriceAll();
      return Promise.resolve();
    }
    if (_cartRepricePromptPromise) return _cartRepricePromptPromise;
    _cartRepricePromptPromise = drifts
      .reduce(function (seq, d) {
        return seq.then(function () {
          return modalInfoPriceChange({ product: d.product, oldPrice: d.oldPrice, newPrice: d.newPrice });
        });
      }, Promise.resolve())
      .then(function () {
        _cartRepricePromptPromise = null;
        Cart._repriceAll();
      });
    return _cartRepricePromptPromise;
  }

  /* ===== INIT ===== */
  function init() {
    loadData();
    renderHeader();
    updateFloatBtns();
    document.getElementById('overlay-backdrop').addEventListener('click', function () {
      if (!document.getElementById('modal-wrap').classList.contains('hidden')) { closeModal(); return; }
      if (state.cartOpen) closeCart();
    });
    restoreSession();
    restoreRoute();
    if (Auth.isCustomer()) {
      renderCartFab();
      setTimeout(showSystemMsg, 800);
    }


    if (window.DB) {
      loadProductsFromFirestore(
        function () {
          App.Store.set('products', window.PRODUCTS);
          var el = document.getElementById('view-content');
          if (el && state.currentView === 'catalog') {
            var _cp = {};
            try {
              var _s = sessionStorage.getItem('yashir_cat_section');
              if (_s === 'full' || _s === 'personal') _cp.section = _s;
            } catch (_e) {}
            CatalogView.render(el, _cp);
          }
        },
        function () {}
      );

      DBSync.loadCustomers(function (ok) {
        if (ok) {
          if (state.currentUser && state.currentUser.role === 'customer') {
            var fresh = (window.CUSTOMERS_DB || []).find(function (c) {
              return c.id === state.currentUser.customer.id;
            });
            if (fresh) state.currentUser.customer = fresh;
            maybeRepriceCartAfterPricingChange();
          }
        }
      });

      if (DBSync.listenCustomers) {
        DBSync.listenCustomers(function () {
          if (state.currentUser && state.currentUser.role === 'customer') {
            var freshCu = (window.CUSTOMERS_DB || []).find(function (c) {
              return c.id === state.currentUser.customer.id;
            });
            if (freshCu) state.currentUser.customer = freshCu;
            maybeRepriceCartAfterPricingChange();
          }
          var elCat = document.getElementById('view-content');
          if (elCat && state.currentView === 'catalog') {
            var _cpLive = {};
            try {
              var _secLive = sessionStorage.getItem('yashir_cat_section');
              if (_secLive === 'full' || _secLive === 'personal') _cpLive.section = _secLive;
            } catch (_eLive) {}
            CatalogView.render(elCat, _cpLive);
          }
        });
      }

      DBSync.loadSettings(function () {
        renderHeader();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ===== PUBLIC API ===== */
  return {
    state: state, Auth: Auth, Cart: Cart, Orders: Orders, Pricing: Pricing, Store: Store, fmtP: fmtP, escHTML: escHTML,
    dateFmt: dateFmt,
    navigate: navigate, goHome: goHome, toggleCart: toggleCart, openCart: openCart, closeCart: closeCart,
    showModal: showModal, closeModal: closeModal, toast: toast, Modal: Modal,
    showSystemMsg: showSystemMsg, startOrder: startOrder, orderCustomerDisplay: orderCustomerDisplay,
    renderHeader: renderHeader, updateFloatBtns: updateFloatBtns,
    showLangSelector: showLangSelector,
    _selectLang: _selectLang, _confirmLang: _confirmLang, _pendingLang: _pendingLang,
    saveSettings: function () {
      Store.set('settings', state.settings);
      if (window.DBSync) DBSync.saveSettings(state.settings);
    },
    checkLowStock: checkLowStock,
    _logoClick: _logoClick, _showSecretAdmin: _showSecretAdmin, _secretLogin: _secretLogin,
    updateOrderStatus: Orders.updateStatus,
    updateOrderPayment: Orders.updatePayment,
    hasCartLineDriftVersusEffectivePricing: hasCartLineDriftVersusEffectivePricing,
    getCartDriftLines: getCartDriftLines,
    maybeRepriceCartAfterPricingChange: maybeRepriceCartAfterPricingChange,
    _priceChangeAckDone: _priceChangeAckDone
  };
})();
