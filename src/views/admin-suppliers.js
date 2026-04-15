/* =============================================================
   AdminSuppliers — ניהול ספקים ועלויות מוצרים
   ============================================================= */
var AdminSuppliers = {
  _suppliers: [],
  _costs: {},

  render: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';

    var loadS = window.DB ? window.DB.collection('suppliers').get() : Promise.resolve({ docs: [] });
    var loadC = window.DB ? window.DB.collection('productCosts').get() : Promise.resolve({ docs: [] });

    Promise.all([loadS, loadC]).then(function (res) {
      AdminSuppliers._suppliers = res[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      AdminSuppliers._costs = {};
      res[1].docs.forEach(function (d) { AdminSuppliers._costs[d.id] = d.data(); });
      AdminSuppliers._renderTable(c);
    }).catch(function () {
      c.innerHTML = '<div class="admin-section"><p style="color:var(--text-muted);padding:24px">לא ניתן לטעון ספקים. וודא שהגדרת Firestore.</p></div>';
    });
  },

  _renderTable: function (c) {
    var rows = AdminSuppliers._suppliers.map(function (s) {
      var prodCount = Object.values(AdminSuppliers._costs).filter(function (co) { return co.supplierId === s.id; }).length;
      return '<tr>' +
        '<td><strong>' + s.name + '</strong></td>' +
        '<td>' + (s.phone || '—') + '</td>' +
        '<td>' + (s.email || '—') + '</td>' +
        '<td>' + prodCount + ' מוצרים</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminSuppliers._editSupplier(\'' + s.id + '\')" title="ערוך"><span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminSuppliers._editCosts(\'' + s.id + '\')" title="עלויות מוצרים"><span class="material-icons-round">price_change</span></button>' +
          '<button class="btn-sm danger" onclick="AdminSuppliers._deleteSupplier(\'' + s.id + '\')" title="מחק"><span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">אין ספקים עדיין</td></tr>';

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>ספקים</h2>' +
        '<button class="btn-primary" onclick="AdminSuppliers._editSupplier(null)">' +
          '<span class="material-icons-round">add</span> הוסף ספק</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>שם ספק</th><th>טלפון</th><th>מייל</th><th>מוצרים</th><th>פעולות</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  },

  _editSupplier: function (id) {
    var s = id ? (AdminSuppliers._suppliers.find(function (x) { return x.id === id; }) || {}) : {};
    App.showModal(
      '<h3>' + (id ? 'עריכת ספק' : 'הוסף ספק חדש') + '</h3>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>שם ספק</label><input type="text" id="sf-name" value="' + (s.name || '') + '"></div>' +
        '<div class="form-group"><label>טלפון</label><input type="tel" id="sf-phone" value="' + (s.phone || '') + '"></div>' +
        '<div class="form-group"><label>מייל</label><input type="email" id="sf-email" value="' + (s.email || '') + '"></div>' +
        '<div class="form-group"><label>הערות</label><textarea id="sf-notes" rows="2">' + (s.notes || '') + '</textarea></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminSuppliers._saveSupplier(\'' + (id || '') + '\')">' +
            '<span class="material-icons-round">save</span> שמור</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveSupplier: function (id) {
    if (!window.DB) { App.toast('Firestore לא מחובר', 'error'); return; }
    var name = document.getElementById('sf-name').value.trim();
    if (!name) { App.toast('שם ספק חובה', 'warning'); return; }
    var data = {
      name:  name,
      phone: document.getElementById('sf-phone').value,
      email: document.getElementById('sf-email').value,
      notes: document.getElementById('sf-notes').value
    };
    var ref = id ? window.DB.collection('suppliers').doc(id) : window.DB.collection('suppliers').doc();
    ref.set(data).then(function () {
      App.toast('הספק נשמר', 'success');
      App.closeModal();
      AdminSuppliers.render(document.getElementById('av-content'));
    }).catch(function () { App.toast('שגיאה בשמירה', 'error'); });
  },

  _deleteSupplier: function (id) {
    if (!confirm('למחוק ספק זה?')) return;
    window.DB.collection('suppliers').doc(id).delete().then(function () {
      App.toast('הספק נמחק', 'success');
      AdminSuppliers.render(document.getElementById('av-content'));
    });
  },

  _editCosts: function (supplierId) {
    var supplier = AdminSuppliers._suppliers.find(function (s) { return s.id === supplierId; });
    if (!supplier) return;
    var rows = PRODUCTS.filter(function (p) { return p.category !== 'shipping'; }).map(function (p) {
      var costData = AdminSuppliers._costs[p.id];
      var isThis   = costData && costData.supplierId === supplierId;
      return '<div class="personal-price-row">' +
        '<span class="sku">' + p.sku + '</span>' +
        '<span style="flex:1">' + p.icon + ' ' + p.name + '</span>' +
        '<span class="base-price-hint">מחיר מכירה: ₪' + p.price + '</span>' +
        '<input type="number" id="sc-' + p.id + '" value="' + (isThis && costData.cost !== undefined ? costData.cost : '') + '" placeholder="עלות" min="0" step="0.01" style="width:85px">' +
      '</div>';
    }).join('');

    App.showModal(
      '<h3>עלויות מספק — ' + supplier.name + '</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">הזן את עלות הקנייה לכל מוצר מספק זה</p>' +
      '<div class="personal-prices-grid">' + rows + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="AdminSuppliers._saveCosts(\'' + supplierId + '\',\'' + supplier.name.replace(/'/g, '') + '\')">' +
          '<span class="material-icons-round">save</span> שמור עלויות</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
      '</div>'
    );
  },

  _saveCosts: function (supplierId, supplierName) {
    if (!window.DB) { App.toast('Firestore לא מחובר', 'error'); return; }
    var batch = window.DB.batch();
    PRODUCTS.filter(function (p) { return p.category !== 'shipping'; }).forEach(function (p) {
      var inp = document.getElementById('sc-' + p.id);
      if (inp && inp.value !== '') {
        var cost = parseFloat(inp.value);
        var ref  = window.DB.collection('productCosts').doc(p.id);
        batch.set(ref, {
          productId:    p.id,
          productName:  p.name,
          supplierId:   supplierId,
          supplierName: supplierName,
          cost:         cost,
          updatedAt:    new Date().toISOString()
        });
        AdminSuppliers._costs[p.id] = { productId: p.id, supplierId: supplierId, supplierName: supplierName, cost: cost };
      }
    });
    batch.commit().then(function () {
      App.toast('עלויות נשמרו', 'success');
      App.closeModal();
    }).catch(function () { App.toast('שגיאה בשמירה', 'error'); });
  }
};
