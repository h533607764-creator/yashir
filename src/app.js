/* =============================================================
   ישיר — App Core
   Auth | Cart | Pricing | Orders | Routing | Toast | Modal
   ============================================================= */
var App = (function () {
  'use strict';

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
      landingSubtitle: 'ישיר שיווק והפצה — מוצרים חד-פעמיים לעסקים ואירועים'
    }
  };

  /* ===== STORAGE (Firebase-ready abstraction) ===== */
  var Store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('yashir_' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('yashir_' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { localStorage.removeItem('yashir_' + k); }
  };

  /* ===== LOAD PERSISTED DATA ===== */
  function loadData() {
    var s = Store.get('settings');
    if (s) Object.assign(state.settings, s);
    var c = Store.get('customers');
    if (c) window.CUSTOMERS_DB = c;
    var p = Store.get('products');
    if (p) window.PRODUCTS = p;
    if (!Store.get('orders')) Store.set('orders', []);
  }

  /* ===== AUTH ===== */
  var Auth = {
    login: function (hp, remember) {
      var c = CUSTOMERS_DB.find(function (x) { return x.id === hp; });
      if (!c) return false;
      state.currentUser = { role: 'customer', customer: c };
      state.cart = [];
      if (remember) Store.set('remember', { hp: hp, exp: Date.now() + 30 * 864e5 });
      return true;
    },
    loginAdmin: function (pin) {
      if (pin !== (state.settings.adminPin || ADMIN_CREDENTIALS.pin)) return false;
      state.currentUser = { role: 'admin' };
      state.cart = [];
      return true;
    },
    logout: function () {
      state.currentUser = null;
      state.cart = [];
      Store.del('remember');
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
    getUnitPrice: function (product, customer) {
      if (!customer) return null;
      var p = customer.personalPrices && customer.personalPrices[product.id];
      if (p !== undefined) return p;
      if (customer.generalDiscount > 0) return Math.round(product.price * (1 - customer.generalDiscount / 100));
      return product.price;
    },
    getDiscountPct: function (product, customer) {
      if (!customer) return 0;
      var p = customer.personalPrices && customer.personalPrices[product.id];
      if (p !== undefined) return Math.max(0, Math.round((1 - p / product.price) * 100));
      return customer.generalDiscount || 0;
    },
    hasPersonal: function (product, customer) {
      return !!(customer && customer.personalPrices && customer.personalPrices[product.id] !== undefined);
    },
    calcTotals: function (items) {
      var subtotal = 0, savings = 0;
      items.forEach(function (i) {
        subtotal += i.unitPrice * i.qty;
        var saved = (i.product.price - i.unitPrice) * i.qty;
        if (saved > 0) savings += saved;
      });
      var vat = Math.round(subtotal * state.settings.vatRate);
      return { subtotal: subtotal, vat: vat, total: subtotal + vat, savings: savings };
    }
  };

  /* ===== CART ===== */
  var Cart = {
    add: function (product, qty) {
      if (!Auth.isCustomer()) { toast('יש להתחבר תחילה', 'warning'); return; }
      if (product.stock === 0) { toast('המוצר חסר במלאי', 'error'); return; }
      qty = qty || 1;
      var customer = state.currentUser.customer;
      var existing = state.cart.find(function (i) { return i.product.id === product.id; });
      if (existing) { existing.qty += qty; }
      else {
        state.cart.push({
          product: product,
          qty: qty,
          unitPrice: Pricing.getUnitPrice(product, customer),
          discountPct: Pricing.getDiscountPct(product, customer)
        });
      }
      Cart.updateBadge();
      toast('נוסף לעגלה ✓', 'success');
    },
    remove: function (id) {
      state.cart = state.cart.filter(function (i) { return i.product.id !== id; });
      Cart.updateBadge();
      if (state.cartOpen) CartView.renderPanel();
    },
    updateQty: function (id, qty) {
      if (qty < 1) { Cart.remove(id); return; }
      var item = state.cart.find(function (i) { return i.product.id === id; });
      if (item) item.qty = qty;
      Cart.updateBadge();
      if (state.cartOpen) CartView.renderPanel();
    },
    clear: function () { state.cart = []; Cart.updateBadge(); },
    count: function () { return state.cart.reduce(function (s, i) { return s + i.qty; }, 0); },
    subtotal: function () { return state.cart.reduce(function (s, i) { return s + i.unitPrice * i.qty; }, 0); },
    needsShipping: function () { return Cart.subtotal() < state.settings.minOrderAmount; },
    getShippingCost: function () {
      var c = state.currentUser && state.currentUser.customer;
      return c ? (c.shippingCost || state.settings.defaultShippingCost) : state.settings.defaultShippingCost;
    },
    updateBadge: function () {
      var badge = document.getElementById('cart-badge');
      var fab = document.getElementById('cart-fab-btn');
      if (!badge) return;
      var n = Cart.count();
      badge.textContent = n;
      badge.style.display = n > 0 ? 'flex' : 'none';
      if (fab) fab.classList.toggle('has-items', n > 0);
    }
  };

  /* ===== ORDERS ===== */
  var Orders = {
    submit: function (notes) {
      if (!Auth.isCustomer() || state.cart.length === 0) return;
      var customer = state.currentUser.customer;
      var items = JSON.parse(JSON.stringify(state.cart));
      if (Cart.needsShipping()) {
        var sc = Cart.getShippingCost();
        items.push({ product: Object.assign({}, SHIPPING_PRODUCT, { price: sc }), qty: 1, unitPrice: sc, discountPct: 0 });
      }
      var totals = Pricing.calcTotals(items);
      var id = state.settings.nextOrderId;
      var order = {
        id: id, customerId: customer.id, customerName: customer.name,
        items: items, subtotal: totals.subtotal, vat: totals.vat,
        total: totals.total, savings: totals.savings,
        notes: notes || '', timestamp: new Date().toISOString(), status: 'pending'
      };
      var all = Store.get('orders') || [];
      all.unshift(order);
      Store.set('orders', all);
      state.settings.nextOrderId++;
      Store.set('settings', state.settings);
      Cart.clear();
      closeCart();
      navigate('success', { order: order });
    },
    getAll: function () { return Store.get('orders') || []; }
  };

  /* ===== ROUTING ===== */
  function navigate(view, params) {
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
      case 'catalog':  CatalogView.render(el, params); break;
      case 'success':  SuccessView.render(el, params); break;
      case 'admin':    Auth.isAdmin() ? AdminView.render(el, params) : navigate('landing'); break;
      default:         LandingView.render(el);
    }
  }

  /* ===== HEADER ===== */
  function renderHeader() {
    var h = document.getElementById('site-header');
    if (!h) return;
    var user = '';
    if (Auth.isAdmin()) {
      user = '<div class="header-user">' +
        '<span class="header-role admin-badge"><span class="material-icons-round" style="font-size:16px">admin_panel_settings</span> מנהל</span>' +
        '<button class="btn-admin-panel" onclick="App.navigate(\'admin\')">פאנל ניהול</button>' +
        '<button class="btn-logout" onclick="App.Auth.logout()"><span class="material-icons-round" style="font-size:18px">logout</span></button>' +
        '</div>';
    } else if (Auth.isCustomer()) {
      user = '<div class="header-user">' +
        '<span class="header-welcome">שלום, <strong>' + state.currentUser.customer.name + '</strong></span>' +
        '<button class="btn-logout orange" onclick="App.Auth.logout()">התנתק</button>' +
        '</div>';
    } else {
      user = '<div class="header-user"><button class="btn-login-header" onclick="App.navigate(\'login\')">כניסה</button></div>';
    }
    h.innerHTML = '<div class="container header-inner">' +
      '<div class="logo" onclick="App.navigate(\'landing\')">' +
        '<div class="logo-mark">י</div>' +
        '<div class="logo-text-wrap"><span class="logo-name">ישיר</span><span class="logo-tagline">שיווק והפצה</span></div>' +
      '</div>' + user + '</div>';
    renderCartFab();
  }

  function renderCartFab() {
    var wrap = document.getElementById('cart-fab-wrap');
    if (!wrap) return;
    if (!Auth.isCustomer()) { wrap.innerHTML = ''; return; }
    var n = Cart.count();
    wrap.innerHTML = '<button id="cart-fab-btn" class="cart-fab' + (n > 0 ? ' has-items' : '') + '" onclick="App.toggleCart()" aria-label="עגלה">' +
      '<span class="material-icons-round" style="font-size:26px">shopping_cart</span>' +
      '<span id="cart-badge" style="display:' + (n > 0 ? 'flex' : 'none') + '">' + n + '</span></button>';
  }

  function updateFloatBtns() {
    var wrap = document.getElementById('floating-btns');
    if (!wrap) return;
    if (state.currentView === 'success') { wrap.innerHTML = ''; return; }
    wrap.innerHTML =
      '<button class="float-btn order-btn" onclick="App.startOrder()">' +
        '<span class="material-icons-round">shopping_bag</span><span>התחלת הזמנה</span>' +
      '</button>' +
      '<button class="float-btn catalog-btn" onclick="App.navigate(\'catalog\')">' +
        '<span class="material-icons-round">menu_book</span><span>הקטלוג שלנו</span>' +
      '</button>';
  }

  /* ===== CART PANEL ===== */
  function toggleCart() {
    state.cartOpen ? closeCart() : openCart();
  }
  function openCart() {
    state.cartOpen = true;
    document.getElementById('cart-panel').classList.remove('hidden');
    document.getElementById('overlay-backdrop').classList.remove('hidden');
    CartView.renderPanel();
  }
  function closeCart() {
    state.cartOpen = false;
    document.getElementById('cart-panel').classList.add('hidden');
    var bd = document.getElementById('overlay-backdrop');
    if (!document.getElementById('modal-wrap').classList.contains('hidden')) return;
    bd.classList.add('hidden');
  }

  /* ===== MODAL ===== */
  function showModal(html) {
    var wrap = document.getElementById('modal-wrap');
    var bd   = document.getElementById('overlay-backdrop');
    wrap.innerHTML = '<div class="modal-box"><button class="modal-close" onclick="App.closeModal()"><span class="material-icons-round">close</span></button>' + html + '</div>';
    wrap.classList.remove('hidden');
    bd.classList.remove('hidden');
  }
  function closeModal() {
    document.getElementById('modal-wrap').classList.add('hidden');
    if (!state.cartOpen) document.getElementById('overlay-backdrop').classList.add('hidden');
  }

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
    }, 2800);
  }

  /* ===== SYSTEM MESSAGE ===== */
  function showSystemMsg() {
    var msg = state.settings.systemMessage;
    if (!msg) return;
    var key = 'sysmsg_' + msg.substring(0, 30);
    if (Store.get(key)) return;
    showModal('<div class="sys-message">' +
      '<div class="sys-icon"><span class="material-icons-round" style="font-size:30px">campaign</span></div>' +
      '<h3>הודעת מערכת</h3><p>' + msg + '</p>' +
      '<button class="btn-primary full-width" onclick="App.closeModal()">הבנתי, תודה</button></div>');
    Store.set(key, 1);
  }

  function showMinOrderMsg() {
    showModal('<div class="sys-message">' +
      '<div class="sys-icon orange"><span class="material-icons-round" style="font-size:30px">local_shipping</span></div>' +
      '<h3>מינימום הזמנה</h3>' +
      '<p>הזמנות מעל <strong>₪' + state.settings.minOrderAmount + '</strong> נשלחות ללא עלות משלוח.</p>' +
      '<p style="font-size:13px;opacity:.7">בהזמנות קטנות יותר — יתווספו דמי משלוח אוטומטית.</p>' +
      '<button class="btn-primary full-width" onclick="App.closeModal()">הבנתי</button></div>');
  }

  function startOrder() {
    if (!Auth.isCustomer()) { navigate('login'); return; }
    navigate('catalog');
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
    Auth.tryAuto();
    navigate('landing');
    if (Auth.isCustomer()) setTimeout(showSystemMsg, 800);
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ===== PUBLIC API ===== */
  return {
    state: state, Auth: Auth, Cart: Cart, Orders: Orders, Pricing: Pricing, Store: Store,
    navigate: navigate, toggleCart: toggleCart, openCart: openCart, closeCart: closeCart,
    showModal: showModal, closeModal: closeModal, toast: toast,
    showSystemMsg: showSystemMsg, showMinOrderMsg: showMinOrderMsg,
    startOrder: startOrder, renderHeader: renderHeader, saveSettings: function () { Store.set('settings', state.settings); }
  };
})();
