/* =============================================================
   DBSync — סינכרון כל נתוני המערכת עם Firestore
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
  var SETTINGS_DOC = 'main';

  function db() { return window.DB; }

  /* ──────────────────────────────────────────
     לקוחות
     ────────────────────────────────────────── */

  function loadCustomers(onDone) {
    if (!db()) { onDone && onDone(false); return; }
    db().collection(COLLECTIONS.CUSTOMERS).get()
      .then(function (snap) {
        if (snap.empty) {
          /* Firestore ריק — מעלה את הלקוחות מ-localStorage/static */
          var existing = window.CUSTOMERS_DB || [];
          if (existing.length) {
            var batch = db().batch();
            existing.forEach(function (c) {
              batch.set(db().collection(COLLECTIONS.CUSTOMERS).doc(String(c.id)), c);
            });
            batch.commit().catch(function () {});
          }
          onDone && onDone(true);
          return;
        }
        var list = [];
        snap.forEach(function (d) { list.push(d.data()); });
        window.CUSTOMERS_DB = list;
        /* שמור ב-localStorage כגיבוי */
        try { localStorage.setItem('yashir_customers', JSON.stringify(list)); } catch (e) {}
        onDone && onDone(true);
      })
      .catch(function (err) {
        console.warn('DBSync.loadCustomers error:', err);
        onDone && onDone(false);
      });
  }

  function saveCustomer(customer, oldId) {
    /* שמור תמיד ב-localStorage */
    try { localStorage.setItem('yashir_customers', JSON.stringify(window.CUSTOMERS_DB)); } catch (e) {}

    if (!db()) return;
    var docId = String(customer.id);
    db().collection(COLLECTIONS.CUSTOMERS).doc(docId).set(customer)
      .catch(function (err) { console.warn('DBSync.saveCustomer error:', err); });

    /* אם ח.פ השתנה — מחק את הישן */
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
        /* אם המסמך לא קיים — set במקום update */
        var cu = (window.CUSTOMERS_DB || []).find(function (c) { return String(c.id) === String(customerId); });
        if (cu) db().collection(COLLECTIONS.CUSTOMERS).doc(String(customerId)).set(cu).catch(function () {});
      });
    try { localStorage.setItem('yashir_customers', JSON.stringify(window.CUSTOMERS_DB)); } catch (e) {}
  }

  /* ──────────────────────────────────────────
     הגדרות מערכת
     ────────────────────────────────────────── */

  function loadSettings(onDone) {
    if (!db()) { onDone && onDone(false); return; }
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC).get()
      .then(function (doc) {
        if (doc.exists) {
          var data = doc.data();
          /* מיזוג עם state.settings הקיים */
          if (window.App && window.App.state) {
            Object.assign(window.App.state.settings, data);
            var st = window.App.state.settings;
            if (st.systemMessage_en === undefined) st.systemMessage_en = '';
            if (st.landingTitle_en === undefined) st.landingTitle_en = '';
            if (st.landingSubtitle_en === undefined) st.landingSubtitle_en = '';
          }
          /* שמור ב-localStorage */
          try { localStorage.setItem('yashir_settings', JSON.stringify(data)); } catch (e) {}
        }
        onDone && onDone(true);
      })
      .catch(function (err) {
        console.warn('DBSync.loadSettings error:', err);
        onDone && onDone(false);
      });
  }

  function saveSettings(settings) {
    try { localStorage.setItem('yashir_settings', JSON.stringify(settings)); } catch (e) {}
    if (!db()) return;
    db().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC).set(settings)
      .catch(function (err) { console.warn('DBSync.saveSettings error:', err); });
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
     טעינה ראשונית של הכל
     ────────────────────────────────────────── */

  function loadAll(onComplete) {
    var remaining = 3;
    function done() { remaining--; if (remaining === 0 && onComplete) onComplete(); }

    loadCustomers(done);
    loadSettings(done);
    /* מוצרים כבר נטענים דרך loadProductsFromFirestore ב-app.js */
    done(); /* placeholder לגנרטור */
  }

  return {
    loadAll:            loadAll,
    loadCustomers:      loadCustomers,
    saveCustomer:       saveCustomer,
    deleteCustomer:     deleteCustomer,
    saveCustomerPrices: saveCustomerPrices,
    loadSettings:       loadSettings,
    saveSettings:       saveSettings,
    loadExpenses:       loadExpenses,
    saveExpense:        saveExpense,
    deleteExpense:      deleteExpense
  };
})();
