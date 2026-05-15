/* =============================================================
   DBSync — סינכרון עם Firestore (כללי אבטחה מבוססי Firebase Auth)
   מקור האמת: Firestore. localStorage = מטמון מהיר בלבד.
   ============================================================= */
var DBSync = (function () {
  'use strict';

  var COLLECTIONS = {
    CUSTOMERS: 'customers',
    SETTINGS:  'app_settings',
    PRODUCTS:  'products',
    EXPENSES:  'expenses'
  };
  var SETTINGS_DOC_MAIN = 'main';
  var SETTINGS_DOC_PUBLIC = 'public';

  var PUBLIC_SETTINGS_KEYS = [
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

  var PRIVATE_SETTINGS_KEYS = ['adminPin', 'nextOrderId'];

  function db() { return window.DB; }

  function normalizeCustomer(data, docId) {
    if (!data) return null;
    var c = Object.assign({}, data);
    var hp = c.hp != null ? c.hp : docId;
    c.hp = hp != null ? String(hp).trim() : '';
    c.password = c.password != null ? String(c.password).trim() : '';
    if (c.id == null || String(c.id).trim() === '') c.id = c.hp;
    return c;
  }

  function pickPublicSettings(settings) {
    var out = {};
    if (!settings) return out;
    PUBLIC_SETTINGS_KEYS.forEach(function (k) {
      if (settings[k] !== undefined) out[k] = settings[k];
    });
    return out;
  }

  function pickPrivateSettings(settings) {
    var out = {};
    if (!settings) return out;
    PRIVATE_SETTINGS_KEYS.forEach(function (k) {
      if (settings[k] !== undefined) out[k] = settings[k];
    });
    return out;
  }

  /* ──────────────────────────────────────────
     לקוחות
     ────────────────────────────────────────── */

  function listenCustomers(onUpdate) {
    if (!db() || !window.AUTH) return function () {};
    if (window.App && App.Auth.isAdmin()) {
      return db().collection(COLLECTIONS.CUSTOMERS).onSnapshot(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(normalizeCustomer(d.data(), d.id)); });
        window.__CUSTOMERS_SOURCE__ = 'Firestore customers listener';
        window.CUSTOMERS_DB = list;
        try { localStorage.setItem('yashir_customers', JSON.stringify(list)); } catch (e) {}
        onUpdate && onUpdate();
      }, function (err) {
        console.warn('DBSync.listenCustomers error:', err);
      });
    }
    if (window.App && App.Auth.isCustomer() && App.state.currentUser.customer) {
      var cid = String(App.state.currentUser.customer.hp);
      return db().collection(COLLECTIONS.CUSTOMERS).doc(cid).onSnapshot(function (doc) {
        if (doc.exists) {
          var c = normalizeCustomer(doc.data(), doc.id);
          window.__CUSTOMERS_SOURCE__ = 'Firestore customer listener';
          window.CUSTOMERS_DB = [c];
          if (App.state.currentUser && App.state.currentUser.customer) {
            App.state.currentUser.customer = c;
          }
          try { localStorage.setItem('yashir_customers', JSON.stringify([c])); } catch (e) {}
        }
        onUpdate && onUpdate();
      }, function (err) {
        console.warn('DBSync.listenCustomers error:', err);
      });
    }
    return function () {};
  }

  function loadCustomers(onDone) {
    if (!db()) { onDone && onDone(false); return; }
    if (!window.App || !App.Auth.isAdmin()) {
      onDone && onDone(false);
      return;
    }
    db().collection(COLLECTIONS.CUSTOMERS).get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(normalizeCustomer(d.data(), d.id)); });
        window.__CUSTOMERS_SOURCE__ = 'Firestore customers loadCustomers';
        window.CUSTOMERS_DB = list;
        try { localStorage.setItem('yashir_customers', JSON.stringify(list)); } catch (e) {}
        onDone && onDone(true);
      })
      .catch(function (err) {
        console.warn('DBSync.loadCustomers error:', err);
        onDone && onDone(false);
      });
  }

  function loadCustomersForAdmin() {
    return loadCustomersPromise();
  }

  function loadCustomersPromise() {
    if (!db()) return Promise.resolve(false);
    return db().collection(COLLECTIONS.CUSTOMERS).get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(normalizeCustomer(d.data(), d.id)); });
        window.__CUSTOMERS_SOURCE__ = 'Firestore customers loadCustomersPromise';
        window.CUSTOMERS_DB = list;
        try { localStorage.setItem('yashir_customers', JSON.stringify(list)); } catch (e) {}
        return true;
      })
      .catch(function (err) {
        console.warn('DBSync.loadCustomersPromise error:', err);
        return false;
      });
  }

  function saveCustomer(customer, oldId) {
    customer = normalizeCustomer(customer);
    if (window.CUSTOMERS_DB) {
      var idx = window.CUSTOMERS_DB.findIndex(function (c) { return String(c.hp).trim() === String(customer.hp).trim(); });
      if (idx > -1) window.CUSTOMERS_DB[idx] = customer;
    }
    try { localStorage.setItem('yashir_customers', JSON.stringify(window.CUSTOMERS_DB)); } catch (e) {}

    if (!db()) return;
    var docId = String(customer.hp).trim();
    db().collection(COLLECTIONS.CUSTOMERS).doc(docId).set(customer)
      .catch(function (err) { console.warn('DBSync.saveCustomer error:', err); });

    if (oldId && String(oldId) !== docId) {
      db().collection(COLLECTIONS.CUSTOMERS).doc(String(oldId)).delete()
        .catch(function () {});
    }
  }

  function deleteCustomer(id) {
    try { localStorage.setItem('yashir_customers', JSON.stringify(window.CUSTOMERS_DB)); } catch (e) {}
    if (!db()) return;
    db().collection(COLLECTIONS.CUSTOMERS).doc(String(id)).delete()
      .catch(function (err) { console.warn('DBSync.deleteCustomer error:', err); });
  }

  function saveCustomerPrices(customerId, personalPrices) {
    if (!db()) return;
    db().collection(COLLECTIONS.CUSTOMERS).doc(String(customerId))
      .update({ personalPrices: personalPrices })
      .catch(function () {
        var cu = (window.CUSTOMERS_DB || []).find(function (c) { return String(c.hp).trim() === String(customerId).trim(); });
        if (cu) db().collection(COLLECTIONS.CUSTOMERS).doc(String(customerId)).set(cu).catch(function () {});
      });
    window.CUSTOMERS_DB = (window.CUSTOMERS_DB || []).map(function (c) { return normalizeCustomer(c); });
    try { localStorage.setItem('yashir_customers', JSON.stringify(window.CUSTOMERS_DB)); } catch (e) {}
  }

  /* ──────────────────────────────────────────
     הגדרות מערכת (public / main מפוצלים)
     ────────────────────────────────────────── */

  function applySettingsToApp(data) {
    if (!data || !window.App || !App.state) return;
    Object.assign(window.App.state.settings, data);
    var st = window.App.state.settings;
    if (st.systemMessage_en === undefined) st.systemMessage_en = '';
    if (st.landingTitle_en === undefined) st.landingTitle_en = '';
    if (st.landingSubtitle_en === undefined) st.landingSubtitle_en = '';
  }

  function loadSettings(onDone) {
    if (!db()) { onDone && onDone(false); return; }
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_PUBLIC).get()
      .then(function (doc) {
        if (doc.exists) {
          applySettingsToApp(doc.data());
          try { localStorage.setItem('yashir_settings', JSON.stringify(window.App.state.settings)); } catch (e) {}
        }
        onDone && onDone(true);
      })
      .catch(function (err) {
        console.warn('DBSync.loadSettings error:', err);
        onDone && onDone(false);
      });
  }

  function loadMainSettings(onDone) {
    if (!db()) { onDone && onDone(false); return; }
    if (!window.App || !App.Auth.isAdmin()) {
      onDone && onDone(false);
      return;
    }
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_MAIN).get()
      .then(function (doc) {
        if (doc.exists) {
          applySettingsToApp(doc.data());
          try { localStorage.setItem('yashir_settings', JSON.stringify(window.App.state.settings)); } catch (e) {}
        }
        onDone && onDone(true);
      })
      .catch(function (err) {
        console.warn('DBSync.loadMainSettings error:', err);
        onDone && onDone(false);
      });
  }

  function saveSettings(settings) {
    try { localStorage.setItem('yashir_settings', JSON.stringify(settings)); } catch (e) {}
    if (!db()) return;
    var pub = pickPublicSettings(settings);
    var priv = pickPrivateSettings(settings);
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_PUBLIC).set(pub, { merge: true })
      .catch(function (err) { console.warn('DBSync.saveSettings public:', err); });
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_MAIN).set(priv, { merge: true })
      .catch(function (err) { console.warn('DBSync.saveSettings main:', err); });
  }

  function bootstrapPublicSettingsIfAdmin(onDone) {
    if (!window.YashirBackend || !window.App || !App.Auth.isAdmin()) {
      onDone && onDone();
      return;
    }
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_PUBLIC).get()
      .then(function (snap) {
        if (snap.exists) {
          onDone && onDone();
          return;
        }
        return YashirBackend.ensurePublicAppSettings().then(function () {
          return loadSettings(onDone);
        }).catch(function () { onDone && onDone(); });
      })
      .catch(function () { onDone && onDone(); });
  }

  /* ──────────────────────────────────────────
     הוצאות (expenses)
     ────────────────────────────────────────── */

  function loadExpenses(onDone) {
    if (!db()) { onDone && onDone([]); return; }
    db().collection(COLLECTIONS.EXPENSES).orderBy('date', 'desc').get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (d) { list.push(Object.assign({ _id: d.id }, d.data())); });
        if (list.length) {
          try { localStorage.setItem('yashir_expenses', JSON.stringify(list)); } catch (e) {}
        }
        onDone && onDone(list);
      })
      .catch(function () {
        var local = [];
        try { local = JSON.parse(localStorage.getItem('yashir_expenses') || '[]'); } catch (e) {}
        onDone && onDone(local);
      });
  }

  function saveExpense(record, onDone) {
    if (!db()) {
      var local = [];
      try { local = JSON.parse(localStorage.getItem('yashir_expenses') || '[]'); } catch (e) {}
      local.unshift(record);
      try { localStorage.setItem('yashir_expenses', JSON.stringify(local)); } catch (e) {}
      onDone && onDone();
      return;
    }
    db().collection(COLLECTIONS.EXPENSES).add(record)
      .then(function () { onDone && onDone(); })
      .catch(function () { onDone && onDone(); });
  }

  function deleteExpense(docId, onDone) {
    if (!db() || !docId) { onDone && onDone(); return; }
    db().collection(COLLECTIONS.EXPENSES).doc(docId).delete()
      .then(function () { onDone && onDone(); })
      .catch(function () { onDone && onDone(); });
  }

  /* ──────────────────────────────────────────
     טעינה ראשונית
     ────────────────────────────────────────── */

  function loadAll(onComplete) {
    var remaining = 2;
    function done() { remaining--; if (remaining === 0 && onComplete) onComplete(); }
    loadSettings(done);
    done();
  }

  return {
    loadAll:            loadAll,
    listenCustomers:    listenCustomers,
    loadCustomers:      loadCustomers,
    loadCustomersForAdmin: loadCustomersForAdmin,
    loadCustomersPromise: loadCustomersPromise,
    saveCustomer:       saveCustomer,
    deleteCustomer:     deleteCustomer,
    saveCustomerPrices: saveCustomerPrices,
    loadSettings:       loadSettings,
    loadMainSettings:   loadMainSettings,
    bootstrapPublicSettingsIfAdmin: bootstrapPublicSettingsIfAdmin,
    saveSettings:       saveSettings,
    loadExpenses:       loadExpenses,
    saveExpense:        saveExpense,
    deleteExpense:      deleteExpense,
    pickPublicSettings: pickPublicSettings,
    pickPrivateSettings: pickPrivateSettings
  };
})();
