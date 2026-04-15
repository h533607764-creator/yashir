/* =============================================================
   ישיר — App Core v3
   ============================================================= */
var App = (function () {
  'use strict';

  /* ===== HELPERS ===== */
  function fmtP(n) {
    var r = Math.round(n * 100) / 100;
    if (r % 1 === 0) return String(r | 0);
    return r.toFixed(2).replace(/\.?0+$/, '');
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
      adminPhone: '',
      adminEmail: '',
      systemMessage: 'ברוכים הבאים לישיר! הזמינו עד יום ג׳ לאספקה ביום ה׳.',
      landingTitle: 'רמה אחת מעל, דאגה אחת פחות',
      landingSubtitle: 'ישיר שיווק והפצה — מוצרים חד-פעמיים לעסקים ואירועים'
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
    if (s) Object.assign(state.settings, s);
    var c = Store.get('customers');
    if (c) window.CUSTOMERS_DB = c;
    /* מוצרים: טוען מ-localStorage כ-fallback מהיר בלבד —
       הסנכרון האמיתי מגיע מ-Firestore בסוף init() */
    var p = Store.get('products');
    if (p && p.length) window.PRODUCTS = p;
    if (!Store.get('orders'))   Store.set('orders', []);
    if (!Store.get('expenses')) Store.set('expenses', []);
  }

  /* ===== AUTH ===== */
  var Auth = {
    login: function (hp, remember) {
      var c = CUSTOMERS_DB.find(function (x) { return x.id === hp; });
      if (!c) return false;
      state.currentUser = { role: 'customer', customer: c };
      state.cart = [];
      Cart._restore();
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
    /* מחזיר את אחוז הנחת הכמות המקסימלי עבור qty נתון */
    getBulkDiscountPct: function (product, qty) {
      var discounts = product.bulkDiscounts;
      if (!discounts || !discounts.length || !qty || qty < 1) return 0;
      var best = 0;
      discounts.forEach(function (d) {
        if (qty >= d.minQty && d.discountPct > best) best = d.discountPct;
      });
      return best;
    },

    /* הסף המינימלי הבא שיפתח הנחת כמות */
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

    /* מחיר יחידה אחרי הנחה אישית + הנחת כמות */
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
      if (p !== undefined) return parseFloat(Math.max(0, (1 - p / product.price) * 100).toFixed(2));
      return customer.generalDiscount || 0;
    },

    /* אחוז הנחה כולל (אישי + כמות) */
    getTotalDiscountPct: function (product, customer, qty) {
      var personalPct = Pricing.getDiscountPct(product, customer);
      var bulkPct     = Pricing.getBulkDiscountPct(product, qty);
      if (personalPct === 0 && bulkPct === 0) return 0;
      /* חישוב מצטבר: (1 - personal%) * (1 - bulk%) */
      var effectivePrice = product.price * (1 - personalPct / 100) * (1 - bulkPct / 100);
      return parseFloat(Math.max(0, (1 - effectivePrice / product.price) * 100).toFixed(2));
    },

    hasPersonal: function (product, customer) {
      return !!(customer && customer.personalPrices && customer.personalPrices[product.id] !== undefined);
    },

    calcTotals: function (items) {
      var subtotal = 0, savings = 0;
      items.forEach(function (i) {
        var lineTotal = parseFloat((i.unitPrice * i.qty).toFixed(2));
        subtotal += lineTotal;
        var saved = parseFloat(((i.product.price - i.unitPrice) * i.qty).toFixed(2));
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

  /* ===== CART ===== */
  var Cart = {
    add: function (product, qty) {
      if (!Auth.isCustomer()) { toast('יש להתחבר תחילה', 'warning'); return; }
      qty = qty || 1;
      var customer = state.currentUser.customer;
      var isOOS = product.stock === 0;

      if (isOOS) {
        toast('מוצר חסר במלאי — ייתכן עיכוב ביום', 'warning');
      }

      var existing = state.cart.find(function (i) { return i.product.id === product.id; });
      if (existing) {
        existing.qty += qty;
        /* עדכון מחיר אחרי שינוי כמות (הנחת כמות) */
        var newEffective = Pricing.getEffectiveUnitPrice(product, customer, existing.qty);
        if (newEffective !== null) existing.unitPrice = newEffective;
        existing.discountPct = Pricing.getTotalDiscountPct(product, customer, existing.qty);
      } else {
        var effectivePrice = Pricing.getEffectiveUnitPrice(product, customer, qty);
        var totalDisc      = Pricing.getTotalDiscountPct(product, customer, qty);
        state.cart.push({
          product:     product,
          qty:         qty,
          unitPrice:   effectivePrice !== null ? effectivePrice : product.price,
          discountPct: totalDisc,
          outOfStock:  isOOS
        });
      }

      Cart._save();
      Cart.updateBadge();
      toast('נוסף לעגלה ✓' + (isOOS ? ' (חסר במלאי)' : ''), isOOS ? 'warning' : 'success');
    },

    remove: function (id) {
      state.cart = state.cart.filter(function (i) { return i.product.id !== id; });
      Cart._save();
      Cart.updateBadge();
      if (state.cartOpen) CartView.renderPanel();
    },

    updateQty: function (id, qty) {
      if (qty < 1) { Cart.remove(id); return; }
      var item = state.cart.find(function (i) { return i.product.id === id; });
      if (item) {
        item.qty = qty;
        /* עדכון מחיר לפי הנחת כמות חדשה */
        var customer = Auth.isCustomer() ? state.currentUser.customer : null;
        if (customer) {
          var newPrice = Pricing.getEffectiveUnitPrice(item.product, customer, qty);
          if (newPrice !== null) item.unitPrice = newPrice;
          item.discountPct = Pricing.getTotalDiscountPct(item.product, customer, qty);
        }
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

    count: function () { return state.cart.reduce(function (s, i) { return s + i.qty; }, 0); },
    subtotal: function () { return parseFloat(state.cart.reduce(function (s, i) { return s + i.unitPrice * i.qty; }, 0).toFixed(2)); },
    needsShipping: function () { return Cart.subtotal() < state.settings.minOrderAmount; },
    getShippingCost: function () {
      var c = state.currentUser && state.currentUser.customer;
      return c ? (c.shippingCost || state.settings.defaultShippingCost) : state.settings.defaultShippingCost;
    },
    hasOOS: function () { return state.cart.some(function (i) { return i.outOfStock || i.product.stock === 0; }); },

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
      state.cart = saved.map(function (s) {
        var p = PRODUCTS.find(function (x) { return x.id === s.pid; });
        if (!p) return null;
        return { product: p, qty: s.qty, unitPrice: s.unitPrice, discountPct: s.discountPct, outOfStock: p.stock === 0 };
      }).filter(Boolean);
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
        id: id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
        items: items,
        subtotal: totals.subtotal,
        vat: totals.vat,
        total: totals.total,
        savings: totals.savings,
        notes: notes || '',
        timestamp: new Date().toISOString(),
        status: 'new',
        paymentStatus: 'unpaid'
      };

      // שמירה ב-localStorage
      var all = Store.get('orders') || [];
      all.unshift(order);
      Store.set('orders', all);

      // שמירה ב-Firestore
      if (window.DB) {
        window.DB.collection('orders').doc(String(id)).set(order)
          .catch(function (e) { console.warn('Firestore order error:', e); });
      }

      var adminPhone = state.settings.adminPhone;
      var adminEmail = state.settings.adminEmail;

      var itemsList = items.filter(function(i){ return i.product.sku !== '1000'; })
        .map(function(i){ return '• ' + i.product.name + ' ×' + i.qty + ' ₪' + fmtP(i.unitPrice * i.qty); }).join('\n');

      var waMsg = '🛒 *הזמנה חדשה #' + id + '*\n' +
        '👤 ' + customer.name + '\n' +
        '📱 ' + (customer.phone || '—') + '\n' +
        '📦 ' + state.cart.length + ' פריטים\n' +
        itemsList + '\n' +
        '💰 לפני מע"מ: ₪' + totals.subtotal + '\n' +
        '💰 סה"כ כולל מע"מ: ₪' + totals.total +
        (notes ? '\n📝 ' + notes : '');

      // WhatsApp למנהל
      if (adminPhone) {
        var ph = adminPhone.replace(/\D/g, '');
        if (ph.startsWith('0')) ph = '972' + ph.substring(1);
        setTimeout(function () {
          window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(waMsg), '_blank');
        }, 900);
      }

      // מייל למנהל
      if (adminEmail) {
        var mailSubject = 'הזמנה חדשה #' + id + ' — ' + customer.name;
        var mailBody = 'הזמנה חדשה התקבלה:\n\n' +
          'מספר הזמנה: #' + id + '\n' +
          'לקוח: ' + customer.name + '\n' +
          'טלפון: ' + (customer.phone || '—') + '\n' +
          'מייל: ' + (customer.email || '—') + '\n\n' +
          'פריטים:\n' + itemsList + '\n\n' +
          'סה"כ לפני מע"מ: ₪' + totals.subtotal + '\n' +
          'מע"מ: ₪' + totals.vat + '\n' +
          'סה"כ כולל מע"מ: ₪' + totals.total +
          (notes ? '\n\nהערות: ' + notes : '') +
          '\n\nישיר שיווק והפצה';
        setTimeout(function () {
          window.open('mailto:' + adminEmail + '?subject=' + encodeURIComponent(mailSubject) + '&body=' + encodeURIComponent(mailBody), '_blank');
        }, 1800);
      }

      state.settings.nextOrderId++;
      Store.set('settings', state.settings);
      Cart.clear();
      closeCart();
      navigate('success', { order: order });
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
      if (newStatus === 'delivered' && customerPhone) {
        var ph = customerPhone.replace(/\D/g, '');
        if (ph.startsWith('0')) ph = '972' + ph.substring(1);
        var msg = '✅ *הזמנה #' + orderId + ' סופקה!*\n' +
          'שלום! ההזמנה שלך הגיעה.\nתודה שהזמנת מישיר שיווק והפצה 🙏';
        window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank');
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
      '<div class="logo" onclick="App._logoClick()" style="cursor:pointer">' +
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

  /* ===== FLOATING BUTTONS ===== */
  function updateFloatBtns() {
    var wrap = document.getElementById('floating-btns');
    if (!wrap) return;

    if (state.currentView === 'landing') {
      /* דף נחיתה — כפתורי כניסה להזמנה וקטלוג */
      wrap.innerHTML =
        '<button class="float-btn order-btn" onclick="App.startOrder()">' +
          '<span class="material-icons-round">shopping_bag</span><span class="float-btn-text">התחלת הזמנה</span>' +
        '</button>' +
        '<button class="float-btn catalog-btn" onclick="App.navigate(\'catalog\')">' +
          '<span class="material-icons-round">menu_book</span><span class="float-btn-text">הקטלוג שלנו</span>' +
        '</button>';
    } else if (state.currentView === 'catalog' && Auth.isCustomer()) {
      /* דף קטלוג — כפתור קטלוג מלא + בקשת מוצר חדש */
      wrap.innerHTML =
        '<button class="float-btn request-btn" onclick="CatalogView.requestNewProduct()">' +
          '<span class="material-icons-round">add_circle</span><span class="float-btn-text">בקשת מוצר חדש</span>' +
        '</button>' +
        '<button class="float-btn catalog-btn" onclick="CatalogView.goFullCatalog()">' +
          '<span class="material-icons-round">menu_book</span><span class="float-btn-text">קטלוג מלא</span>' +
        '</button>';
    } else {
      wrap.innerHTML = '';
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
    }, 3200);
  }

  /* ===== SYSTEM MESSAGES ===== */
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

  function startOrder() {
    if (!Auth.isCustomer()) { navigate('login'); return; }
    navigate('catalog');
  }

  /* ===== SECRET ADMIN LOGIN (5× logo click) ===== */
  var _logoClicks = 0;
  var _logoTimer  = null;

  function _logoClick() {
    _logoClicks++;
    clearTimeout(_logoTimer);
    _logoTimer = setTimeout(function () { _logoClicks = 0; }, 3000);
    if (_logoClicks >= 5) {
      _logoClicks = 0;
      _showSecretAdmin();
      return;
    }
    navigate('landing');
  }

  function _showSecretAdmin() {
    var old = document.getElementById('secret-admin');
    if (old) { old.remove(); return; }
    var el = document.createElement('div');
    el.id = 'secret-admin';
    el.innerHTML =
      '<p style="font-size:12px;color:var(--text-muted);text-align:center;margin:0">ניהול מערכת</p>' +
      '<input type="password" id="sec-pin" placeholder="קוד גישה" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:8px;padding:11px 14px;color:var(--text);font-family:inherit;font-size:16px;text-align:center;width:100%">' +
      '<button onclick="App._secretLogin()" style="background:var(--orange);color:#fff;border-radius:8px;padding:12px;font-weight:800;font-family:inherit;font-size:15px;cursor:pointer;border:none;width:100%">כניסה</button>';
    el.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:600;' +
      'background:var(--navy-mid);border:1px solid var(--border);border-radius:14px;' +
      'padding:20px;box-shadow:0 8px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:12px;min-width:260px;max-width:90vw';
    document.body.appendChild(el);
    setTimeout(function () {
      var p = document.getElementById('sec-pin');
      if (p) { p.focus(); p.addEventListener('keydown', function (e) { if (e.key === 'Enter') _secretLogin(); }); }
    }, 50);
    setTimeout(function () {
      function away(e) {
        var box = document.getElementById('secret-admin');
        if (box && !box.contains(e.target)) { box.remove(); document.removeEventListener('click', away); }
      }
      document.addEventListener('click', away);
    }, 200);
  }

  function _secretLogin() {
    var pin = document.getElementById('sec-pin');
    if (!pin) return;
    if (Auth.loginAdmin(pin.value)) {
      var el = document.getElementById('secret-admin');
      if (el) el.remove();
      renderHeader();
      navigate('admin');
    } else {
      toast('קוד שגוי', 'error');
      pin.value = ''; pin.focus();
    }
  }

  /* ===== LOW STOCK ALERT ===== */
  function checkLowStock(product) {
    var threshold = product.lowStockThreshold != null ? product.lowStockThreshold : 10;
    if (product.stock > 0 && product.stock <= threshold) {
      var phone = state.settings.adminPhone || '9720552961177';
      var email = state.settings.adminEmail || 'yashir.shivuk@gmail.com';
      var txt   = 'התראת מלאי נמוך: מוצר "' + product.name + '" (מק"ט ' + product.sku + ') — נשארו ' + product.stock + ' יחידות.';
      var waUrl = 'https://wa.me/' + phone.replace(/\D/g,'').replace(/^0/,'972') + '?text=' + encodeURIComponent(txt);
      var mlUrl = 'mailto:' + email + '?subject=' + encodeURIComponent('התראת מלאי נמוך — ' + product.name) +
                  '&body=' + encodeURIComponent(txt + '\n\nישיר שיווק והפצה');
      showModal(
        '<div class="sys-message">' +
          '<div class="sys-icon" style="background:var(--orange-dim);color:var(--orange)"><span class="material-icons-round" style="font-size:30px">warning_amber</span></div>' +
          '<h3>מלאי נמוך!</h3>' +
          '<p><strong>' + product.name + '</strong> — נשארו <strong>' + product.stock + '</strong> יחידות בלבד.</p>' +
          '<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;width:100%">' +
            '<a href="' + waUrl + '" target="_blank" class="btn-primary full-width" style="text-decoration:none;justify-content:center">' +
              '<span class="material-icons-round">chat</span> שלח התראה ב-WhatsApp</a>' +
            '<a href="' + mlUrl + '" class="btn-secondary full-width" style="text-decoration:none;justify-content:center">' +
              '<span class="material-icons-round">email</span> שלח התראה במייל</a>' +
            '<button class="btn-secondary" onclick="App.closeModal()">סגור</button>' +
          '</div>' +
        '</div>'
      );
    }
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
    if (Auth.isCustomer()) {
      renderCartFab();
      setTimeout(showSystemMsg, 800);
    }

    /* טעינת מוצרים מ-Firestore (מקור האמת היחיד) */
    if (window.DB) {
      loadProductsFromFirestore(
        function () {
          /* הצלחה — שמור גם ב-localStorage כגיבוי ורענן תצוגה */
          App.Store.set('products', window.PRODUCTS);
          var el = document.getElementById('view-content');
          if (el && state.currentView === 'catalog') {
            CatalogView.render(el);
          }
        },
        function () {
          /* timeout/שגיאה — נשאר עם localStorage או static */
        }
      );
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ===== PUBLIC API ===== */
  return {
    state: state, Auth: Auth, Cart: Cart, Orders: Orders, Pricing: Pricing, Store: Store, fmtP: fmtP,
    navigate: navigate, toggleCart: toggleCart, openCart: openCart, closeCart: closeCart,
    showModal: showModal, closeModal: closeModal, toast: toast,
    showSystemMsg: showSystemMsg, startOrder: startOrder,
    renderHeader: renderHeader, updateFloatBtns: updateFloatBtns,
    saveSettings: function () { Store.set('settings', state.settings); },
    checkLowStock: checkLowStock,
    _logoClick: _logoClick, _showSecretAdmin: _showSecretAdmin, _secretLogin: _secretLogin,
    updateOrderStatus: Orders.updateStatus,
    updateOrderPayment: Orders.updatePayment
  };
})();
