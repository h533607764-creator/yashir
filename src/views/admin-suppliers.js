/* =============================================================
   AdminSuppliers — Suppliers & product costs
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
      c.innerHTML = '<div class="admin-section"><p style="color:var(--text-muted);padding:24px">' + t('admin.cannotLoadSuppliers') + '</p></div>';
    });
  },

  _renderTable: function (c) {
    var rows = AdminSuppliers._suppliers.map(function (s) {
      var prodCount = Object.values(AdminSuppliers._costs).filter(function (co) { return co.supplierId === s.id; }).length;
      return '<tr>' +
        '<td><strong>' + s.name + '</strong></td>' +
        '<td><code style="font-size:12px">' + (s.vatId || '—') + '</code></td>' +
        '<td>' + (s.phone || '—') + '</td>' +
        '<td>' + (s.email || '—') + '</td>' +
        '<td>' + prodCount + ' ' + t('admin.supplierProducts') + '</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminSuppliers._editSupplier(\'' + s.id + '\')" title="' + t('common.edit') + '"><span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminSuppliers._editCosts(\'' + s.id + '\')" title="' + t('admin.supplierCostsBtn') + '"><span class="material-icons-round">price_change</span></button>' +
          '<button class="btn-sm danger" onclick="AdminSuppliers._deleteSupplier(\'' + s.id + '\')" title="' + t('common.delete') + '"><span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">' + t('admin.noSuppliers') + '</td></tr>';

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>' + t('admin.suppliersTitle') + '</h2>' +
        '<button class="btn-primary" onclick="AdminSuppliers._editSupplier(null)">' +
          '<span class="material-icons-round">add</span> ' + t('admin.addSupplier') + '</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>' + t('admin.supplierName') + '</th><th>' + t('admin.supplierHp') + '</th><th>' + t('common.phone') + '</th><th>' + t('common.email') + '</th><th>' + t('common.products') + '</th><th>' + t('common.actions') + '</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  },

  _editSupplier: function (id) {
    var s = id ? (AdminSuppliers._suppliers.find(function (x) { return x.id === id; }) || {}) : {};
    App.showModal(
      '<h3>' + (id ? t('admin.editSupplier') : t('admin.addNewSupplier')) + '</h3>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>' + t('admin.supplierName') + '</label><input type="text" id="sf-name" value="' + (s.name || '') + '"></div>' +
        '<div class="form-group"><label>' + t('admin.supplierVatId') + '</label><input type="text" id="sf-vat" value="' + (s.vatId || '') + '"></div>' +
        '<div class="form-group"><label>' + t('common.phone') + '</label><input type="tel" id="sf-phone" value="' + (s.phone || '') + '"></div>' +
        '<div class="form-group"><label>' + t('common.email') + '</label><input type="email" id="sf-email" value="' + (s.email || '') + '"></div>' +
        '<div class="form-group"><label>' + t('admin.supplierNotes') + '</label><textarea id="sf-notes" rows="2">' + (s.notes || '') + '</textarea></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminSuppliers._saveSupplier(\'' + (id || '') + '\')">' +
            '<span class="material-icons-round">save</span> ' + t('common.save') + '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveSupplier: function (id) {
    if (!window.DB) { App.toast(t('admin.firestoreNotConnected'), 'error'); return; }
    var name = document.getElementById('sf-name').value.trim();
    if (!name) { App.toast(t('admin.supplierNameRequired'), 'warning'); return; }
    var data = {
      name:  name,
      vatId: document.getElementById('sf-vat').value.trim(),
      phone: document.getElementById('sf-phone').value,
      email: document.getElementById('sf-email').value,
      notes: document.getElementById('sf-notes').value
    };
    var ref = id ? window.DB.collection('suppliers').doc(id) : window.DB.collection('suppliers').doc();
    ref.set(data).then(function () {
      App.toast(t('admin.supplierSaved'), 'success');
      App.closeModal();
      AdminSuppliers.render(document.getElementById('av-content'));
    }).catch(function () { App.toast(t('admin.saveError'), 'error'); });
  },

  _deleteSupplier: function (id) {
    if (!confirm(t('admin.deleteSupplierConfirm'))) return;
    window.DB.collection('suppliers').doc(id).delete().then(function () {
      App.toast(t('admin.supplierDeleted'), 'success');
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
        '<span style="flex:1">' + p.icon + ' ' + pLang(p, 'name') + '</span>' +
        '<span class="base-price-hint">' + t('admin.salePrice') + ' ₪' + p.price + '</span>' +
        '<input type="number" id="sc-' + p.id + '" value="' + (isThis && costData.cost !== undefined ? costData.cost : '') + '" placeholder="' + t('admin.costPlaceholder') + '" min="0" step="0.01" style="width:85px">' +
      '</div>';
    }).join('');

    App.showModal(
      '<h3>' + t('admin.supplierCosts') + ' ' + supplier.name + '</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">' + t('admin.costInstr') + '</p>' +
      '<div class="personal-prices-grid">' + rows + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="AdminSuppliers._saveCosts(\'' + supplierId + '\',\'' + supplier.name.replace(/'/g, '') + '\')">' +
          '<span class="material-icons-round">save</span> ' + t('admin.saveCosts') + '</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
      '</div>'
    );
  },

  _saveCosts: function (supplierId, supplierName) {
    if (!window.DB) { App.toast(t('admin.firestoreNotConnected'), 'error'); return; }
    var batch = window.DB.batch();
    PRODUCTS.filter(function (p) { return p.category !== 'shipping'; }).forEach(function (p) {
      var inp = document.getElementById('sc-' + p.id);
      if (inp && inp.value !== '') {
        var cost = parseFloat(inp.value);
        var ref  = window.DB.collection('productCosts').doc(p.id);
        batch.set(ref, {
          productId:    p.id,
          productName:  p.name,
          productName_en: p.name_en || '',
          supplierId:   supplierId,
          supplierName: supplierName,
          cost:         cost,
          updatedAt:    new Date().toISOString()
        });
        AdminSuppliers._costs[p.id] = { productId: p.id, supplierId: supplierId, supplierName: supplierName, cost: cost };
      }
    });
    batch.commit().then(function () {
      App.toast(t('admin.costsSaved'), 'success');
      App.closeModal();
    }).catch(function () { App.toast(t('admin.saveError'), 'error'); });
  }
};
