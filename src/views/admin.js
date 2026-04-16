var AdminView = {
  _storedCustomerName: function (r) {
    if (I18n.getLang() === 'en' && r.customerName_en) return r.customerName_en;
    return r.customerName || '';
  },

  _statsCustomerLabel: function (hebrewName) {
    if (I18n.getLang() !== 'en' || !hebrewName) return hebrewName;
    var cu = CUSTOMERS_DB.find(function (x) { return x.name === hebrewName; });
    return (cu && cu.name_en) ? cu.name_en : hebrewName;
  },

  _tab: 'orders',
  _ordersUnsub: null,
  _lastOrders: [],

  render: function (el, params) {
    params = params || {};
    if (params.tab) AdminView._tab = params.tab;
    var tabs = [
      { id: 'orders',          label: t('admin.orders'),          icon: 'list_alt' },
      { id: 'customers',       label: t('admin.customers'),       icon: 'people' },
      { id: 'products',        label: t('admin.productsTab'),     icon: 'inventory_2' },
      { id: 'suppliers',       label: t('admin.suppliers'),       icon: 'local_shipping' },
      { id: 'quote_requests',  label: t('admin.quoteRequests'),   icon: 'request_quote' },
      { id: 'product_requests',label: t('admin.productRequests'), icon: 'add_circle' },
      { id: 'profit',          label: t('admin.profit'),          icon: 'trending_up' },
      { id: 'stats',           label: t('admin.stats'),           icon: 'bar_chart' },
      { id: 'financial',       label: t('admin.financial'),       icon: 'account_balance_wallet' },
      { id: 'settings',        label: t('admin.settingsTab'),     icon: 'settings' }
    ];
    el.innerHTML =
      '<div class="admin-page"><div class="container">' +
        '<h1 class="admin-title"><span class="material-icons-round">admin_panel_settings</span> ' + t('admin.panelTitle') + '</h1>' +
        '<div class="admin-tabs">' +
          tabs.map(function (tb) {
            return '<button class="admin-tab' + (AdminView._tab === tb.id ? ' active' : '') + '" onclick="AdminView.tab(\'' + tb.id + '\')">' +
              '<span class="material-icons-round">' + tb.icon + '</span> ' + tb.label + '</button>';
          }).join('') +
        '</div>' +
        '<div id="av-content"></div>' +
      '</div></div>';
    AdminView._render(AdminView._tab);
    setTimeout(AdminView._checkNewOrders, 700);
  },

  tab: function (id) {
    if (AdminView._tab === 'orders' && id !== 'orders' && AdminView._ordersUnsub) {
      AdminView._ordersUnsub(); AdminView._ordersUnsub = null;
    }
    AdminView._tab = id;
    document.querySelectorAll('.admin-tab').forEach(function (b) { b.classList.remove('active'); });
    var btn = document.querySelector('.admin-tab[onclick="AdminView.tab(\'' + id + '\')"]');
    if (btn) btn.classList.add('active');
    AdminView._render(id);
  },

  _render: function (id) {
    var c = document.getElementById('av-content');
    if (!c) return;
    var map = {
      orders:          AdminView._orders,
      customers:       AdminView._customers,
      products:        AdminView._products,
      suppliers:       function (c) { AdminSuppliers.render(c); },
      quote_requests:  AdminView._quoteRequests,
      product_requests:AdminView._productRequests,
      profit:          function (c) { AdminProfit.render(c); },
      stats:           AdminView._stats,
      financial:       function (c) { AdminFinancial.render(c); },
      settings:        AdminView._settings
    };
    if (map[id]) map[id](c);
  },

  /* ===== ORDERS ===== */
  _orders: function (c) {
    var SL = { new: t('admin.statusNew'), processing: t('admin.statusProcessing'), ready: t('admin.statusReady'), shipped: t('admin.statusShipped'), delivered: t('admin.statusDelivered') };
    var SC = { new:'var(--orange)', processing:'var(--blue)', ready:'#8b5cf6', shipped:'#06b6d4', delivered:'#22c55e' };

    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';

    if (AdminView._ordersUnsub) { AdminView._ordersUnsub(); AdminView._ordersUnsub = null; }

    function renderOrders(all) {
      AdminView._lastOrders = all;
      var newCount = all.filter(function (o) { return o.status === 'new'; }).length;
      var rows = all.length ? all.map(function (o) {
        var d = App.dateFmt(o.timestamp);
        var paid = o.paymentStatus === 'paid';
        var ph = (o.customerPhone || '').replace(/'/g, '');
        var sOpts = Object.keys(SL).map(function (s) {
          return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + SL[s] + '</option>';
        }).join('');
        return '<tr>' +
          '<td><strong>' + o.id + '</strong></td>' +
          '<td><div>' + App.escHTML(App.orderCustomerDisplay(o)) + '</div>' +
            (o.customerPhone ? '<div style="font-size:11px;color:var(--text-muted)">' + App.escHTML(o.customerPhone) + '</div>' : '') +
          '</td>' +
          '<td>' + d + '</td>' +
          '<td><div style="color:var(--text-muted);font-size:12px">' + t('admin.beforeVat') + ' ₪' + o.subtotal + '</div>' +
               '<div style="color:var(--blue);font-weight:700">' + t('admin.withVat') + ' ₪' + o.total + '</div></td>' +
          '<td><select onchange="AdminView._setStatus(\'' + o.id + '\',this.value,\'' + ph + '\')" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;color:' + (SC[o.status] || 'var(--text)') + '">' + sOpts + '</select></td>' +
          '<td><button class="btn-sm" onclick="AdminView._togglePayment(\'' + o.id + '\',\'' + (o.paymentStatus||'unpaid') + '\')" style="font-size:11px;white-space:nowrap">' +
            (paid ? t('admin.paid') : t('admin.pending')) + '</button></td>' +
          '<td style="display:flex;gap:4px;padding:8px;flex-wrap:wrap">' +
            '<button class="btn-sm" title="' + t('admin.view') + '" onclick="AdminView._viewOrder(\'' + o.id + '\')"><span class="material-icons-round">visibility</span></button>' +
            '<button class="btn-sm" title="' + t('admin.deliveryNote') + '" onclick="SuccessView.printNote(\'' + o.id + '\')"><span class="material-icons-round">print</span></button>' +
            '<button class="btn-sm danger" title="' + t('admin.deleteOrder') + '" onclick="AdminView._delOrder(\'' + o.id + '\')"><span class="material-icons-round">delete</span></button>' +
          '</td></tr>';
      }).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">' + t('admin.noOrders') + '</td></tr>';

      c.innerHTML = '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>' + t('admin.orders') +
          (newCount > 0 ? ' <span style="background:var(--orange);color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;margin-right:6px">' + newCount + ' ' + t('admin.newOrders') + '</span>' : '') +
        '</h2><span style="font-size:13px;color:var(--text-muted)">' + all.length + ' ' + t('admin.totalOrders') + '</span></div>' +
        '<div class="table-wrap"><table class="admin-table">' +
          '<thead><tr><th>' + t('admin.orderNumber') + '</th><th>' + t('admin.customerCol') + '</th><th>' + t('admin.dateCol') + '</th><th>' + t('admin.totalCol') + '</th><th>' + t('admin.statusCol') + '</th><th>' + t('admin.paymentCol') + '</th><th>' + t('admin.actionsCol') + '</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div></div>';
    }

    if (window.DB) {
      AdminView._ordersUnsub = window.DB.collection('orders').orderBy('timestamp', 'desc')
        .onSnapshot(function (snap) {
          var all = []; snap.forEach(function (d) { all.push(d.data()); }); renderOrders(all);
        }, function () { renderOrders(App.Orders.getAll()); });
    } else {
      renderOrders(App.Orders.getAll());
    }
  },

  _setStatus: function (orderId, newStatus, phone) {
    App.updateOrderStatus(orderId, newStatus, phone);
    App.toast(t('admin.statusUpdated'), 'success');
  },

  _togglePayment: function (orderId, current) {
    var next = current === 'paid' ? 'unpaid' : 'paid';
    App.updateOrderPayment(orderId, next);
    App.toast(next === 'paid' ? t('admin.markedPaid') : t('admin.markedPending'), next === 'paid' ? 'success' : 'info');
  },

  _checkNewOrders: function () {
    if (!window.DB) return;
    window.DB.collection('orders').where('status', '==', 'new').get()
      .then(function (snap) {
        if (snap.empty) return;
        App.showModal(
          '<div class="sys-message">' +
            '<div class="sys-icon" style="background:var(--orange-dim)"><span class="material-icons-round" style="font-size:30px;color:var(--orange)">notifications_active</span></div>' +
            '<h3>' + snap.size + ' ' + t('admin.newOrdersWaiting') + '</h3>' +
            '<p>' + t('admin.pendingOrdersMsg') + '</p>' +
            '<div style="display:flex;gap:10px;margin-top:12px">' +
              '<button class="btn-primary" onclick="App.closeModal();AdminView.tab(\'orders\')">' + t('admin.viewOrders') + '</button>' +
              '<button class="btn-secondary" onclick="App.closeModal()">' + t('admin.later') + '</button>' +
            '</div>' +
          '</div>'
        );
      }).catch(function () {});
  },

  _delOrder: function (orderId) {
    if (!confirm(t('admin.deleteConfirm') + orderId + t('admin.cannotRestore'))) return;
    var all = App.Orders.getAll();
    var filtered = all.filter(function (x) { return String(x.id) !== String(orderId); });
    App.Store.set('orders', filtered);
    if (window.DB) {
      window.DB.collection('orders').doc(String(orderId)).delete()
        .catch(function (e) { console.warn('Firestore delete order error:', e); });
    }
    App.toast(t('admin.orderDeleted'), 'success');
    AdminView._orders(document.getElementById('av-content'));
  },

  _viewOrder: function (orderId) {
    var o = (AdminView._lastOrders || []).find(function (x) { return String(x.id) === String(orderId); })
          || (App.Orders.getAll()).find(function (x) { return String(x.id) === String(orderId); });
    if (!o) { App.toast(t('admin.orderNotFound'), 'error'); return; }
    var rows = o.items.map(function (i) {
      return '<tr><td>' + i.product.sku + '</td><td>' + pLang(i.product, 'name') + '</td><td>' + i.qty + '</td>' +
        '<td>' + App.fmtP(i.discountPct) + '%</td><td>₪' + App.fmtP(i.unitPrice * i.qty) + '</td></tr>';
    }).join('');
    App.showModal(
      '<h3>' + t('admin.order') + ' #' + o.id + ' — ' + App.escHTML(App.orderCustomerDisplay(o)) + '</h3>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>' + t('common.sku') + '</th><th>' + t('admin.product') + '</th><th>' + t('admin.qtyCol') + '</th><th>' + t('admin.discountCol') + '</th><th>' + t('common.total') + '</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="order-totals">' +
        '<div>' + t('admin.beforeVat') + ' ₪' + o.subtotal + '</div>' +
        '<div>' + t('cart.vat') + ' ₪' + o.vat + '</div>' +
        '<div style="font-weight:700;font-size:16px">' + t('cart.totalWithVat') + ': ₪' + o.total + '</div>' +
        (o.savings > 0 ? '<div style="color:var(--green)">' + t('admin.savingsLabel') + ' ₪' + o.savings + '</div>' : '') +
      '</div>' +
      (o.notes ? '<p style="margin-top:8px;font-size:14px;color:var(--text-muted)"><strong>' + t('admin.notesLabel') + '</strong> ' + App.escHTML(o.notes) + '</p>' : '') +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="SuccessView.printNote(\'' + o.id + '\');App.closeModal()">' +
          '<span class="material-icons-round">print</span> ' + t('admin.printDelivery') + '</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.close') + '</button>' +
      '</div>'
    );
  },

  /* ===== CUSTOMERS ===== */
  _customers: function (c) {
    var rows = CUSTOMERS_DB.map(function (cu) {
      var debt = cu.existingDebt || 0;
      return '<tr>' +
        '<td><code style="font-size:12px">' + cu.id + '</code></td>' +
        '<td><strong>' + App.escHTML(pLang(cu, 'name')) + '</strong></td>' +
        '<td>' + (cu.phone || '—') + '</td>' +
        '<td>' + (cu.generalDiscount || 0) + '%</td>' +
        '<td>' + (cu.paymentTerms || t('admin.cash')) + '</td>' +
        '<td style="color:' + (debt > 0 ? 'var(--orange)' : 'inherit') + ';font-weight:' + (debt > 0 ? '700' : '400') + '">₪' + debt + '</td>' +
        '<td>' + Object.keys(cu.personalPrices || {}).length + ' ' + t('common.products') + '</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminView._editCust(\'' + cu.id + '\')" title="' + t('common.edit') + '"><span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminView._custPrices(\'' + cu.id + '\')" title="' + t('admin.personalPrices') + '"><span class="material-icons-round">price_change</span></button>' +
          '<button class="btn-sm danger" onclick="AdminView._delCust(\'' + cu.id + '\')" title="' + t('common.delete') + '"><span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('');

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>' + t('admin.customers') + '</h2>' +
        '<button class="btn-primary" onclick="AdminView._editCust(null)">' +
          '<span class="material-icons-round">person_add</span> ' + t('admin.addCustomer') + '</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>' + t('admin.hpCol') + '</th><th>' + t('admin.nameCol') + '</th><th>' + t('admin.phoneCol') + '</th><th>' + t('admin.discountColCust') + '</th><th>' + t('admin.paymentTerms') + '</th><th>' + t('admin.existingDebt') + '</th><th>' + t('admin.pricesCol') + '</th><th>' + t('admin.actionsCol') + '</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
  },

  _fld: function (label, id, value, type, disabled) {
    return '<div class="form-group"><label>' + label + '</label>' +
      '<input type="' + (type || 'text') + '" id="' + id + '" value="' + (value || '') + '"' + (disabled ? ' disabled style="opacity:.5"' : '') + '></div>';
  },

  _fldTranslate: function (label, enId, value, heId) {
    var btnHtml = heId
      ? '<button type="button" onclick="AutoTranslate.translateField(\'' + heId + '\',\'' + enId + '\')" style="background:var(--blue-dim);color:var(--blue);border:1px solid var(--border-blue);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:3px"><span class="material-icons-round" style="font-size:13px">translate</span>' + t('admin.translateBtn') + '</button>'
      : '';
    return '<div class="form-group"><div style="display:flex;justify-content:space-between;align-items:center"><label style="margin:0">' + label + '</label>' + btnHtml + '</div>' +
      '<input type="text" id="' + enId + '" value="' + (value || '') + '" dir="ltr" style="text-align:left"></div>';
  },

  _fldTransliterate: function (label, enId, value, heId) {
    var btnHtml = heId
      ? '<button type="button" onclick="AutoTransliterate.fillField(\'' + heId + '\',\'' + enId + '\')" style="background:var(--blue-dim);color:var(--blue);border:1px solid var(--border-blue);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:3px"><span class="material-icons-round" style="font-size:13px">sort_by_alpha</span>' + t('admin.transliterateBtn') + '</button>'
      : '';
    return '<div class="form-group"><div style="display:flex;justify-content:space-between;align-items:center"><label style="margin:0">' + label + '</label>' + btnHtml + '</div>' +
      '<input type="text" id="' + enId + '" value="' + (value || '') + '" dir="ltr" style="text-align:left"></div>';
  },

  _translateAllEdit: function () {
    var catSel = document.getElementById('pf-cat-edit');
    var subcatSel = document.getElementById('pf-subcat-edit');
    var catText = catSel ? catSel.options[catSel.selectedIndex].text : '';
    var subcatText = subcatSel ? subcatSel.options[subcatSel.selectedIndex].text : '';
    var soldBySel = document.getElementById('pf-soldby');
    var soldByText = soldBySel ? soldBySel.value : '';

    var catEnInp = document.getElementById('pf-catlabel-en');
    var subcatEnInp = document.getElementById('pf-subcatlabel-en');
    var soldByEnInp = document.getElementById('pf-soldby-en');

    var pairs = [
      ['pf-name', 'pf-name-en'],
      ['pf-desc', 'pf-desc-en']
    ];

    var extraCount = 0;
    if (catText && catEnInp) {
      catEnInp.value = '...'; catEnInp.style.opacity = '0.5'; extraCount++;
      AutoTranslate.translate(catText, function (r) { catEnInp.value = r; catEnInp.style.opacity = '1'; extraCount--; }, function () { catEnInp.value = ''; catEnInp.style.opacity = '1'; extraCount--; });
    }
    if (subcatText && subcatEnInp) {
      subcatEnInp.value = '...'; subcatEnInp.style.opacity = '0.5'; extraCount++;
      AutoTranslate.translate(subcatText, function (r) { subcatEnInp.value = r; subcatEnInp.style.opacity = '1'; extraCount--; }, function () { subcatEnInp.value = ''; subcatEnInp.style.opacity = '1'; extraCount--; });
    }
    if (soldByText && soldByEnInp) {
      soldByEnInp.value = '...'; soldByEnInp.style.opacity = '0.5'; extraCount++;
      AutoTranslate.translate(soldByText, function (r) { soldByEnInp.value = r; soldByEnInp.style.opacity = '1'; extraCount--; }, function () { soldByEnInp.value = ''; soldByEnInp.style.opacity = '1'; extraCount--; });
    }

    AutoTranslate.translateAll(pairs);
  },

  _translateAllAdd: function () {
    var catSel = document.getElementById('pf-cat');
    var subcatSel = document.getElementById('pf-subcat');
    var catText = catSel ? catSel.options[catSel.selectedIndex].text : '';
    var subcatText = subcatSel ? subcatSel.options[subcatSel.selectedIndex].text : '';
    var soldBySel = document.getElementById('pf-soldby');
    var soldByText = soldBySel ? soldBySel.value : '';

    var catEnInp = document.getElementById('pf-catlabel-en');
    var subcatEnInp = document.getElementById('pf-subcatlabel-en');
    var soldByEnInp = document.getElementById('pf-soldby-en');

    var pairs = [
      ['pf-name', 'pf-name-en'],
      ['pf-desc', 'pf-desc-en']
    ];

    if (catText && catEnInp) {
      catEnInp.value = '...'; catEnInp.style.opacity = '0.5';
      AutoTranslate.translate(catText, function (r) { catEnInp.value = r; catEnInp.style.opacity = '1'; }, function () { catEnInp.value = ''; catEnInp.style.opacity = '1'; });
    }
    if (subcatText && subcatEnInp) {
      subcatEnInp.value = '...'; subcatEnInp.style.opacity = '0.5';
      AutoTranslate.translate(subcatText, function (r) { subcatEnInp.value = r; subcatEnInp.style.opacity = '1'; }, function () { subcatEnInp.value = ''; subcatEnInp.style.opacity = '1'; });
    }
    if (soldByText && soldByEnInp) {
      soldByEnInp.value = '...'; soldByEnInp.style.opacity = '0.5';
      AutoTranslate.translate(soldByText, function (r) { soldByEnInp.value = r; soldByEnInp.style.opacity = '1'; }, function () { soldByEnInp.value = ''; soldByEnInp.style.opacity = '1'; });
    }

    AutoTranslate.translateAll(pairs);
  },

  _editCust: function (id) {
    var isNew = !id;
    var cu = isNew
      ? { id:'', name:'', name_en:'', email:'', phone:'', address:'', contactPerson:'', shippingAddress:'', generalDiscount:0, shippingCost:45, paymentTerms: t('admin.cash'), existingDebt:0, personalPrices:{} }
      : CUSTOMERS_DB.find(function (x) { return x.id === id; }) || {};
    var termsOpts = [t('admin.cash'),'שוטף 30','שוטף 60','שוטף 90','שוטף+30','שוטף+60'].map(function (trm) {
      return '<option value="' + trm + '"' + (cu.paymentTerms === trm ? ' selected' : '') + '>' + trm + '</option>';
    }).join('');
    App.showModal(
      '<h3>' + (isNew ? t('admin.addNewCustomer') : t('admin.editCustomer') + ' ' + pLang(cu, 'name')) + '</h3>' +
      '<div class="customer-form">' +
        AdminView._fld(t('admin.hpField'), 'ef-id', cu.id, 'text') +
        (isNew ? '' : '<p style="font-size:12px;color:var(--orange);margin-top:-8px">' + t('admin.hpChangeWarning') + '</p>') +
        AdminView._fld(t('admin.businessName'), 'ef-name', cu.name, 'text') +
        AdminView._fldTransliterate(t('admin.customerNameEn'), 'ef-name-en', cu.name_en || '', 'ef-name') +
        AdminView._fld(t('common.phone'), 'ef-phone', cu.phone, 'tel') +
        AdminView._fld(t('common.email'), 'ef-email', cu.email, 'email') +
        AdminView._fld(t('admin.address'), 'ef-address', cu.address, 'text') +
        AdminView._fld(t('admin.shippingContact'), 'ef-contact', cu.contactPerson, 'text') +
        AdminView._fld(t('admin.shippingAddress'), 'ef-shaddr', cu.shippingAddress, 'text') +
        AdminView._fld(t('admin.generalDiscount'), 'ef-disc', cu.generalDiscount, 'number') +
        AdminView._fld(t('admin.personalShipping'), 'ef-ship', cu.shippingCost, 'number') +
        AdminView._fld(t('admin.existingDebtField'), 'ef-debt', cu.existingDebt || 0, 'number') +
        '<div class="form-group"><label>' + t('admin.paymentTermsField') + '</label>' +
          '<select id="ef-terms" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
            termsOpts +
          '</select></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminView._saveCust(\'' + (id || '') + '\')">' +
            '<span class="material-icons-round">save</span> ' + t('common.save') + '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveCust: function (origId) {
    var id   = document.getElementById('ef-id').value.trim();
    var name = document.getElementById('ef-name').value.trim();
    if (!id || !name) { App.toast(t('admin.hpNameRequired'), 'warning'); return; }
    var duplicate = CUSTOMERS_DB.find(function (x) { return x.id === id && x.id !== origId; });
    if (duplicate) { App.toast(t('admin.hpCol') + ' ' + id + ' ' + t('admin.hpExists'), 'error'); return; }
    var existing = origId ? CUSTOMERS_DB.find(function (x) { return x.id === origId; }) : null;
    var data = {
      id: id, name: name,
      name_en: (document.getElementById('ef-name-en') || {}).value.trim() || '',
      phone:           document.getElementById('ef-phone').value,
      email:           document.getElementById('ef-email').value,
      address:         document.getElementById('ef-address').value,
      contactPerson:   document.getElementById('ef-contact').value,
      shippingAddress: document.getElementById('ef-shaddr').value,
      generalDiscount: parseFloat(document.getElementById('ef-disc').value) || 0,
      shippingCost:    parseFloat(document.getElementById('ef-ship').value) || 45,
      paymentTerms:    document.getElementById('ef-terms').value,
      existingDebt:    parseFloat(document.getElementById('ef-debt').value) || 0,
      personalPrices:  existing ? (existing.personalPrices || {}) : {}
    };
    if (origId && origId !== id) {
      var oldIdx = CUSTOMERS_DB.findIndex(function (x) { return x.id === origId; });
      if (oldIdx > -1) CUSTOMERS_DB.splice(oldIdx, 1);
      CUSTOMERS_DB.push(data);
      DBSync.deleteCustomer(origId);
      var allOrders = App.Store.get('orders') || [];
      var updated = false;
      allOrders.forEach(function (o) {
        if (String(o.customerId) === String(origId)) { o.customerId = id; updated = true; }
      });
      if (updated) App.Store.set('orders', allOrders);
      App.Store.del('cart_' + origId);
      if (window.DB) {
        window.DB.collection('orders').where('customerId', '==', origId).get()
          .then(function (snap) {
            if (snap.empty) return;
            var batch = window.DB.batch();
            snap.forEach(function (d) {
              batch.update(d.ref, { customerId: id });
            });
            return batch.commit();
          })
          .catch(function (e) { console.warn('Firestore migrate order customerId:', e); });
      }
    } else if (origId) {
      var idx = CUSTOMERS_DB.findIndex(function (x) { return x.id === origId; });
      if (idx > -1) CUSTOMERS_DB[idx] = data; else CUSTOMERS_DB.push(data);
    } else {
      CUSTOMERS_DB.push(data);
    }
    DBSync.saveCustomer(data);
    App.closeModal();
    App.toast(t('admin.customerSaved'), 'success');
    AdminView._customers(document.getElementById('av-content'));
  },

  _delCust: function (id) {
    if (!confirm(t('admin.deleteCustomerConfirm') + ' ' + id + '?')) return;
    window.CUSTOMERS_DB = CUSTOMERS_DB.filter(function (x) { return x.id !== id; });
    DBSync.deleteCustomer(id);
    App.toast(t('admin.customerDeleted'), 'success');
    AdminView._customers(document.getElementById('av-content'));
  },

  _custPrices: function (custId) {
    var cu = CUSTOMERS_DB.find(function (x) { return x.id === custId; });
    if (!cu) return;
    var rows = PRODUCTS.filter(function(p){ return p.category !== 'shipping'; }).map(function (p) {
      var currPrice = cu.personalPrices && cu.personalPrices[p.id] !== undefined ? cu.personalPrices[p.id] : '';
      var currPct   = currPrice !== '' ? Math.max(0, Math.round((1 - currPrice / p.price) * 100)) : '';
      return '<div class="personal-price-row">' +
        '<span class="sku">' + p.sku + '</span>' +
        '<span style="flex:1">' + pLang(p, 'name') + '</span>' +
        '<span class="base-price-hint">' + t('admin.generalLabel') + ' ₪' + p.price + '</span>' +
        '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">' +
          '<div style="display:flex;align-items:center;gap:4px">' +
            '<span style="font-size:11px;color:var(--text-muted);width:22px">₪</span>' +
            '<input type="number" id="pp-price-' + p.id + '" value="' + currPrice + '" placeholder="—" min="0" step="0.01" style="width:75px" oninput="AdminView._syncPct(\'' + p.id + '\',' + p.price + ')">' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:4px">' +
            '<span style="font-size:11px;color:var(--text-muted);width:22px">%</span>' +
            '<input type="number" id="pp-pct-' + p.id + '" value="' + currPct + '" placeholder="—" min="0" max="100" style="width:75px" oninput="AdminView._syncPrice(\'' + p.id + '\',' + p.price + ')">' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    App.showModal(
      '<h3>' + t('admin.personalPricesTitle') + ' ' + pLang(cu, 'name') + '</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">' + t('admin.priceInstr') + '</p>' +
      '<div class="personal-prices-grid">' + rows + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="AdminView._savePrices(\'' + custId + '\')">' +
          '<span class="material-icons-round">save</span> ' + t('admin.savePrices') + '</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
      '</div>'
    );
  },

  _syncPct: function (id, basePrice) {
    var priceInp = document.getElementById('pp-price-' + id);
    var pctInp   = document.getElementById('pp-pct-' + id);
    if (!priceInp || !pctInp) return;
    var price = parseFloat(priceInp.value);
    if (!isNaN(price) && basePrice > 0) {
      pctInp.value = Math.max(0, Math.round((1 - price / basePrice) * 100));
    } else { pctInp.value = ''; }
  },

  _syncPrice: function (id, basePrice) {
    var priceInp = document.getElementById('pp-price-' + id);
    var pctInp   = document.getElementById('pp-pct-' + id);
    if (!priceInp || !pctInp) return;
    var pct = parseFloat(pctInp.value);
    if (!isNaN(pct) && basePrice > 0) {
      priceInp.value = parseFloat((basePrice * (1 - pct / 100)).toFixed(2));
    } else { priceInp.value = ''; }
  },

  _savePrices: function (custId) {
    var cu = CUSTOMERS_DB.find(function (x) { return x.id === custId; });
    if (!cu) return;
    cu.personalPrices = {};
    PRODUCTS.forEach(function (p) {
      var inp = document.getElementById('pp-price-' + p.id);
      if (inp && inp.value !== '') cu.personalPrices[p.id] = parseFloat(parseFloat(inp.value).toFixed(2));
    });
    DBSync.saveCustomer(cu);
    App.closeModal();
    App.toast(t('admin.pricesSaved'), 'success');
  },

  /* ===== PRODUCTS ===== */
  _products: function (c) {
    var rows = PRODUCTS.map(function (p) {
      var thumb = p.image
        ? '<img src="' + CloudinaryUpload.buildThumbUrl(p.image) + '" alt="' + pLang(p, 'name') + '" loading="lazy" style="width:60px;height:44px;object-fit:cover;border-radius:6px;display:block">'
        : '<span style="font-size:26px;display:block;text-align:center">' + p.icon + '</span>';
      var hasBulk = p.bulkDiscounts && p.bulkDiscounts.length > 0;
      return '<tr>' +
        '<td><code>' + p.sku + '</code></td>' +
        '<td style="display:flex;align-items:center;gap:10px;padding:8px 14px">' + thumb + '<span>' + App.escHTML(pLang(p, 'name')) + '</span></td>' +
        '<td>' + pLang(p, 'categoryLabel') + '</td>' +
        '<td>' + (pLang(p, 'subcategoryLabel') || '—') + '</td>' +
        '<td style="color:var(--blue);font-weight:700">₪' + p.price + '</td>' +
        '<td>' + (p.soldBy ? pLang(p, 'soldBy') : '—') + (p.unitsPerPackage ? ' / ' + p.unitsPerPackage + ' ' + t('common.units') : '') + '</td>' +
        '<td>' + (hasBulk ? '<span style="color:var(--green);font-size:12px">' + t('admin.hasBulk') + '</span>' : '—') + '</td>' +
        '<td>' + (p.stock > 0 ? p.stock : '<span style="color:var(--red)">' + t('admin.outOfStockLabel') + '</span>') + '</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminView._editProd(\'' + p.id + '\')" title="' + t('common.edit') + '">' +
            '<span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminView._quickUpload(\'' + p.id + '\')" title="' + t('admin.uploadPhoto') + '" style="background:var(--orange-dim);color:var(--orange)">' +
            '<span class="material-icons-round">add_photo_alternate</span></button>' +
          '<button class="btn-sm danger" onclick="AdminView._delProd(\'' + p.id + '\')" title="' + t('admin.deleteProduct') + '">' +
            '<span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('');

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>' + t('admin.productsTab') + '</h2>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn-primary" onclick="AdminView._addProd()">' +
            '<span class="material-icons-round">add</span> ' + t('admin.addProduct') + '</button>' +
          '<button class="btn-secondary" onclick="AdminView._showImport()" style="font-size:13px">' +
            '<span class="material-icons-round">upload_file</span> ' + t('admin.importJson') + '</button>' +
        '</div>' +
      '</div>' +
      '<p class="admin-note">' + t('common.lastUpdate') + ': ' + App.dateFmt(new Date()) + ' | Cloud: dmqjap7r1</p>' +
      '<input type="file" id="quick-upload-input" accept="image/*" style="display:none" onchange="AdminView._handleQuickUpload(this)">' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>' + t('admin.skuCol') + '</th><th>' + t('admin.nameProductCol') + '</th><th>' + t('admin.categoryCol') + '</th><th>' + t('admin.subcategoryCol') + '</th><th>' + t('admin.priceCol') + '</th><th>' + t('admin.packagingCol') + '</th><th>' + t('admin.bulkDiscountCol') + '</th><th>' + t('admin.stockCol') + '</th><th>' + t('admin.actionsCol') + '</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
  },

  _quickUpload: function (productId) {
    AdminView._pendingUploadId = productId;
    var inp = document.getElementById('quick-upload-input');
    if (inp) inp.click();
  },

  _handleQuickUpload: function (input) {
    var productId = AdminView._pendingUploadId;
    if (!productId || !input.files || !input.files[0]) return;
    var file = input.files[0];
    input.value = '';
    App.toast(t('admin.uploading'), 'info');
    AdminView._doUpload(file, productId, function () {
      App.toast(t('admin.uploaded'), 'success');
      AdminView._products(document.getElementById('av-content'));
    });
  },

  _doUpload: function (file, productId, onDone) {
    var p = PRODUCTS.find(function (x) { return x.id === productId; });
    if (!p) return;
    CloudinaryUpload.upload(file, {
      onProgress: function (pct) {
        var bar = document.getElementById('upload-progress-' + productId);
        if (bar) {
          bar.style.display = 'block';
          bar.querySelector('.upload-bar-fill').style.width = pct + '%';
          bar.querySelector('.upload-bar-label').textContent = pct + '%';
        }
      },
      onSuccess: function (url) {
        p.image = url;
        App.Store.set('products', PRODUCTS);
        var prev = document.getElementById('img-preview-' + productId);
        if (prev) { prev.src = url; prev.style.display = 'block'; }
        var bar = document.getElementById('upload-progress-' + productId);
        if (bar) bar.style.display = 'none';
        if (onDone) onDone(url);
      },
      onError: function (msg) {
        App.toast(t('common.error') + ': ' + msg, 'error');
        var bar = document.getElementById('upload-progress-' + productId);
        if (bar) bar.style.display = 'none';
      }
    });
  },

  _bulkDiscountsEditor: function (bulkDiscounts, containerId) {
    var discounts = bulkDiscounts || [];
    var rows = discounts.map(function (d, i) {
      return '<div class="bulk-row" id="bdr-' + containerId + '-' + i + '">' +
        '<span style="font-size:13px;color:var(--text-muted)">' + t('admin.fromQty') + '</span>' +
        '<input type="number" id="bd-qty-' + containerId + '-' + i + '" value="' + d.minQty + '" min="1" placeholder="' + t('common.qty') + '" style="width:70px">' +
        '<span style="font-size:13px;color:var(--text-muted)">' + t('admin.unitsDiscount') + '</span>' +
        '<input type="number" id="bd-pct-' + containerId + '-' + i + '" value="' + d.discountPct + '" min="1" max="99" placeholder="%" style="width:60px">' +
        '<span style="font-size:13px;color:var(--text-muted)">%</span>' +
        '<button onclick="document.getElementById(\'bdr-' + containerId + '-' + i + '\').remove()" style="background:var(--red-dim);color:var(--red);border-radius:4px;padding:4px 8px;font-size:12px">' +
          '<span class="material-icons-round" style="font-size:14px">delete</span>' +
        '</button>' +
      '</div>';
    }).join('');
    return '<div class="form-group">' +
      '<label>' + t('admin.bulkDiscountEditor') + '</label>' +
      '<div id="bulk-rows-' + containerId + '" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">' + rows + '</div>' +
      '<button onclick="AdminView._addBulkRow(\'' + containerId + '\')" style="background:var(--blue-dim);color:var(--blue);border-radius:6px;padding:7px 14px;font-size:13px;font-weight:700;border:1px solid var(--border-blue)">' +
        '<span class="material-icons-round" style="font-size:15px">add</span> ' + t('admin.addBulkStep') +
      '</button>' +
    '</div>';
  },

  _addBulkRow: function (containerId) {
    var container = document.getElementById('bulk-rows-' + containerId);
    if (!container) return;
    var idx = container.children.length;
    var div = document.createElement('div');
    div.className = 'bulk-row';
    div.id = 'bdr-' + containerId + '-' + idx;
    div.innerHTML =
      '<span style="font-size:13px;color:var(--text-muted)">' + t('admin.fromQty') + '</span>' +
      '<input type="number" id="bd-qty-' + containerId + '-' + idx + '" value="" min="1" placeholder="' + t('common.qty') + '" style="width:70px">' +
      '<span style="font-size:13px;color:var(--text-muted)">' + t('admin.unitsDiscount') + '</span>' +
      '<input type="number" id="bd-pct-' + containerId + '-' + idx + '" value="" min="1" max="99" placeholder="%" style="width:60px">' +
      '<span style="font-size:13px;color:var(--text-muted)">%</span>' +
      '<button onclick="this.parentElement.remove()" style="background:var(--red-dim);color:var(--red);border-radius:4px;padding:4px 8px;font-size:12px">' +
        '<span class="material-icons-round" style="font-size:14px">delete</span>' +
      '</button>';
    container.appendChild(div);
  },

  _readBulkDiscounts: function (containerId) {
    var container = document.getElementById('bulk-rows-' + containerId);
    if (!container) return [];
    var result = [];
    Array.from(container.children).forEach(function (row) {
      var qtyInp = row.querySelector('[id^="bd-qty-"]');
      var pctInp = row.querySelector('[id^="bd-pct-"]');
      if (qtyInp && pctInp && qtyInp.value && pctInp.value) {
        var qty = parseInt(qtyInp.value);
        var pct = parseFloat(pctInp.value);
        if (qty > 0 && pct > 0) result.push({ minQty: qty, discountPct: pct });
      }
    });
    return result.sort(function (a, b) { return a.minQty - b.minQty; });
  },

  _getSubcatsForCategory: function (cat) {
    var subcatSet = {};
    PRODUCTS.forEach(function (x) {
      if (x.category === cat && x.subcategory && x.category !== 'shipping') {
        subcatSet[x.subcategory] = x.subcategoryLabel || x.subcategory;
      }
    });
    return subcatSet;
  },

  _editProd: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var previewUrl = p.image ? CloudinaryUpload.buildCatalogUrl(p.image) : null;
    var threshold  = p.lowStockThreshold != null ? p.lowStockThreshold : 10;
    var soldByOpts = [t('admin.soldByCarton'),t('admin.soldBySack'),t('admin.soldByPack'),t('admin.soldByBundle'),t('admin.soldByCrate'),t('admin.soldByPallet')].map(function (o) {
      return '<option value="' + o + '"' + (p.soldBy === o ? ' selected' : '') + '>' + o + '</option>';
    }).join('');

    var catSet = {};
    PRODUCTS.forEach(function (x) {
      if (x.category && x.category !== 'shipping') catSet[x.category] = x.categoryLabel || x.category;
    });
    var catOpts = Object.keys(catSet).map(function (k) {
      return '<option value="' + k + '"' + (p.category === k ? ' selected' : '') + '>' + catSet[k] + '</option>';
    }).join('');

    var subcatSet = AdminView._getSubcatsForCategory(p.category);
    var subcatOpts = '<option value="">' + t('admin.noSubcategory') + '</option>' +
      Object.keys(subcatSet).map(function (k) {
        return '<option value="' + k + '"' + (p.subcategory === k ? ' selected' : '') + '>' + subcatSet[k] + '</option>';
      }).join('');

    App.showModal(
      '<h3>' + t('admin.editProductTitle') + ' ' + p.icon + ' ' + pLang(p, 'name') + '</h3>' +
      '<div class="customer-form">' +
        AdminView._fld(t('admin.productName'), 'pf-name', p.name) +
        AdminView._fld(t('admin.priceBeforeVat'), 'pf-price', p.price, 'number') +
        AdminView._fld(t('admin.stock'), 'pf-stock', p.stock, 'number') +
        AdminView._fld(t('admin.lowStockThreshold'), 'pf-threshold', threshold, 'number') +
        AdminView._fld(t('common.description'), 'pf-desc', p.description) +
        '<div class="form-group"><label>' + t('admin.category') + '</label>' +
          '<select id="pf-cat-edit" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%" onchange="AdminView._onCatEditChange()">' +
            catOpts +
            '<option value="__new__">' + t('admin.newCategory') + '</option>' +
          '</select>' +
          '<input type="text" id="pf-cat-new-edit" placeholder="' + t('admin.enterCatName') + '" style="display:none;margin-top:6px;background:var(--input-bg);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
        '</div>' +
        '<div class="form-group"><label>' + t('admin.subcategory') + '</label>' +
          '<select id="pf-subcat-edit" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%" onchange="AdminView._onSubcatEditChange()">' +
            subcatOpts +
            '<option value="__new__">' + t('admin.newSubcategory') + '</option>' +
          '</select>' +
          '<input type="text" id="pf-subcat-new-edit" placeholder="' + t('admin.enterSubcatName') + '" style="display:none;margin-top:6px;background:var(--input-bg);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
        '</div>' +
        '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">' + t('admin.englishSection') + '</p>' +
            '<button type="button" onclick="AdminView._translateAllEdit()" style="background:var(--blue);color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;border:none;cursor:pointer"><span class="material-icons-round" style="font-size:15px">translate</span> ' + t('admin.translateAll') + '</button>' +
          '</div>' +
          AdminView._fldTranslate(t('admin.productNameEn'), 'pf-name-en', p.name_en || '', 'pf-name') +
          AdminView._fldTranslate(t('admin.descriptionEn'), 'pf-desc-en', p.description_en || '', 'pf-desc') +
          AdminView._fldTranslate(t('admin.categoryLabelEn'), 'pf-catlabel-en', p.categoryLabel_en || '', null) +
          AdminView._fldTranslate(t('admin.subcategoryLabelEn'), 'pf-subcatlabel-en', p.subcategoryLabel_en || '', null) +
          AdminView._fldTranslate(t('admin.soldByEn'), 'pf-soldby-en', p.soldBy_en || '', null) +
        '</div>' +
        '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;">' +
          '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">' + t('admin.packagingDetails') + '</p>' +
          AdminView._fld(t('admin.unitsInPack'), 'pf-upkg', p.unitsPerPackage || '', 'number') +
          '<div class="form-group"><label>' + t('admin.soldBy') + '</label>' +
            '<select id="pf-soldby" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
              '<option value="">' + t('admin.selectSoldBy') + '</option>' + soldByOpts +
            '</select></div>' +
          AdminView._fld(t('admin.unitsInContainer'), 'pf-ucont', p.unitsPerContainer || '', 'number') +
          AdminView._bulkDiscountsEditor(p.bulkDiscounts, 'edit-' + id) +
        '</div>' +
        '<div class="form-group" style="gap:10px">' +
          '<label>' + t('admin.productImage') + '</label>' +
          '<div id="img-preview-wrap" style="margin-bottom:8px">' +
            (previewUrl
              ? '<img id="img-preview-' + id + '" src="' + previewUrl + '" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1.5px solid var(--border)">'
              : '<div id="img-preview-' + id + '" style="display:none"></div>' +
                '<div style="padding:20px;text-align:center;background:var(--navy-dark);border-radius:10px;border:1.5px dashed var(--border);color:var(--text-muted);font-size:14px">' +
                '<span class="material-icons-round" style="font-size:32px;display:block;margin-bottom:6px">image</span>' + t('admin.noImageYet') + '</div>') +
          '</div>' +
          '<label class="upload-btn-label" style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--blue-dim);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;font-weight:700;color:var(--blue)">' +
            '<span class="material-icons-round">add_photo_alternate</span> ' + t('admin.chooseImage') +
            '<input type="file" accept="image/*" style="display:none" onchange="AdminView._handleEditUpload(\'' + id + '\',this)">' +
          '</label>' +
          '<div id="upload-progress-' + id + '" style="display:none;margin-top:6px">' +
            '<div style="background:var(--navy-dark);border-radius:4px;overflow:hidden;height:8px">' +
              '<div class="upload-bar-fill" style="height:100%;background:var(--blue);width:0%;transition:width .3s"></div>' +
            '</div>' +
            '<span class="upload-bar-label" style="font-size:12px;color:var(--text-muted)">0%</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminView._saveProd(\'' + id + '\')">' +
            '<span class="material-icons-round">save</span> ' + t('admin.saveDetails') + '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.close') + '</button>' +
        '</div>' +
      '</div>'
    );
  },

  _handleEditUpload: function (productId, input) {
    if (!input.files || !input.files[0]) return;
    AdminView._doUpload(input.files[0], productId, function () {
      App.toast(t('admin.uploadedLinked'), 'success');
    });
  },

  _onCatEditChange: function () {
    var sel = document.getElementById('pf-cat-edit');
    var inp = document.getElementById('pf-cat-new-edit');
    if (!sel || !inp) return;
    inp.style.display = sel.value === '__new__' ? 'block' : 'none';
    AdminView._refreshSubcatSelect('pf-subcat-edit', 'pf-subcat-new-edit', sel.value);
  },

  _onSubcatEditChange: function () {
    var sel = document.getElementById('pf-subcat-edit');
    var inp = document.getElementById('pf-subcat-new-edit');
    if (!sel || !inp) return;
    inp.style.display = sel.value === '__new__' ? 'block' : 'none';
  },

  _onCatAddChange: function () {
    var sel = document.getElementById('pf-cat');
    var inp = document.getElementById('pf-cat-new');
    if (!sel || !inp) return;
    inp.style.display = sel.value === '__new__' ? 'block' : 'none';
    AdminView._refreshSubcatSelect('pf-subcat', 'pf-subcat-new', sel.value);
  },

  _onSubcatAddChange: function () {
    var sel = document.getElementById('pf-subcat');
    var inp = document.getElementById('pf-subcat-new');
    if (!sel || !inp) return;
    inp.style.display = sel.value === '__new__' ? 'block' : 'none';
  },

  _refreshSubcatSelect: function (selectId, newInputId, catValue) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var subcatSet = catValue !== '__new__' ? AdminView._getSubcatsForCategory(catValue) : {};
    var html = '<option value="">' + t('admin.noSubcategory') + '</option>';
    Object.keys(subcatSet).forEach(function (k) {
      html += '<option value="' + k + '">' + subcatSet[k] + '</option>';
    });
    html += '<option value="__new__">' + t('admin.newSubcategory') + '</option>';
    sel.innerHTML = html;
    var inp = document.getElementById(newInputId);
    if (inp) inp.style.display = 'none';
  },

  _addProd: function () {
    var soldByOpts = [t('admin.soldByCarton'),t('admin.soldBySack'),t('admin.soldByPack'),t('admin.soldByBundle'),t('admin.soldByCrate'),t('admin.soldByPallet')].map(function (o) {
      return '<option value="' + o + '">' + o + '</option>';
    }).join('');

    var catSet = {};
    PRODUCTS.forEach(function (x) {
      if (x.category && x.category !== 'shipping') catSet[x.category] = x.categoryLabel || x.category;
    });
    if (!catSet['cups'])    catSet['cups']    = 'כוסות';
    if (!catSet['plates'])  catSet['plates']  = 'צלחות';
    if (!catSet['napkins']) catSet['napkins'] = 'מפיות';
    var catOpts = Object.keys(catSet).map(function (k) {
      return '<option value="' + k + '">' + catSet[k] + '</option>';
    }).join('');

    var firstCat = Object.keys(catSet)[0] || '';
    var subcatSet = AdminView._getSubcatsForCategory(firstCat);
    var subcatOpts = '<option value="">' + t('admin.noSubcategory') + '</option>' +
      Object.keys(subcatSet).map(function (k) {
        return '<option value="' + k + '">' + subcatSet[k] + '</option>';
      }).join('');

    App.showModal(
      '<h3>' + t('admin.addNewProduct') + '</h3>' +
      '<div class="customer-form">' +
        AdminView._fld(t('admin.skuNumber'), 'pf-sku', '', 'text') +
        AdminView._fld(t('admin.productName'), 'pf-name', '') +
        AdminView._fld(t('admin.priceBeforeVatShort'), 'pf-price', '', 'number') +
        AdminView._fld(t('admin.stock'), 'pf-stock', '100', 'number') +
        AdminView._fld(t('common.description'), 'pf-desc', '') +
        '<div class="form-group"><label>' + t('admin.category') + '</label>' +
          '<select id="pf-cat" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%" onchange="AdminView._onCatAddChange()">' +
            catOpts +
            '<option value="__new__">' + t('admin.newCategory') + '</option>' +
          '</select>' +
          '<input type="text" id="pf-cat-new" placeholder="' + t('admin.enterCatName') + '" style="display:none;margin-top:6px;background:var(--input-bg);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
        '</div>' +
        '<div class="form-group"><label>' + t('admin.subcategory') + '</label>' +
          '<select id="pf-subcat" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%" onchange="AdminView._onSubcatAddChange()">' +
            subcatOpts +
            '<option value="__new__">' + t('admin.newSubcategory') + '</option>' +
          '</select>' +
          '<input type="text" id="pf-subcat-new" placeholder="' + t('admin.enterSubcatName') + '" style="display:none;margin-top:6px;background:var(--input-bg);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
        '</div>' +
        '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">' + t('admin.englishSection') + '</p>' +
            '<button type="button" onclick="AdminView._translateAllAdd()" style="background:var(--blue);color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;border:none;cursor:pointer"><span class="material-icons-round" style="font-size:15px">translate</span> ' + t('admin.translateAll') + '</button>' +
          '</div>' +
          AdminView._fldTranslate(t('admin.productNameEn'), 'pf-name-en', '', 'pf-name') +
          AdminView._fldTranslate(t('admin.descriptionEn'), 'pf-desc-en', '', 'pf-desc') +
          AdminView._fldTranslate(t('admin.categoryLabelEn'), 'pf-catlabel-en', '', null) +
          AdminView._fldTranslate(t('admin.subcategoryLabelEn'), 'pf-subcatlabel-en', '', null) +
          AdminView._fldTranslate(t('admin.soldByEn'), 'pf-soldby-en', '', null) +
        '</div>' +
        '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;">' +
          '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">' + t('admin.packagingDetails') + '</p>' +
          AdminView._fld(t('admin.unitsInPack'), 'pf-upkg', '', 'number') +
          '<div class="form-group"><label>' + t('admin.soldBy') + '</label>' +
            '<select id="pf-soldby" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
              '<option value="">' + t('admin.selectSoldBy') + '</option>' + soldByOpts +
            '</select></div>' +
          AdminView._fld(t('admin.unitsInContainer'), 'pf-ucont', '', 'number') +
          AdminView._bulkDiscountsEditor([], 'new-prod') +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminView._saveNewProd()">' +
            '<span class="material-icons-round">add</span> ' + t('common.add') + '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveProd: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    p.name              = document.getElementById('pf-name').value || p.name;
    p.price             = parseFloat(document.getElementById('pf-price').value) || p.price;
    p.stock             = parseInt(document.getElementById('pf-stock').value) || 0;
    p.lowStockThreshold = (function () { var n = parseInt((document.getElementById('pf-threshold') || {}).value, 10); return Number.isNaN(n) ? 10 : n; })();
    p.description       = document.getElementById('pf-desc').value || p.description;
    p.name_en              = (document.getElementById('pf-name-en') || {}).value || p.name_en || '';
    p.description_en       = (document.getElementById('pf-desc-en') || {}).value || p.description_en || '';
    p.categoryLabel_en     = (document.getElementById('pf-catlabel-en') || {}).value || p.categoryLabel_en || '';
    p.subcategoryLabel_en  = (document.getElementById('pf-subcatlabel-en') || {}).value || p.subcategoryLabel_en || '';
    p.soldBy_en            = (document.getElementById('pf-soldby-en') || {}).value || p.soldBy_en || '';
    p.unitsPerPackage   = parseInt(document.getElementById('pf-upkg').value) || null;
    p.soldBy            = document.getElementById('pf-soldby').value || null;
    p.unitsPerContainer = parseInt(document.getElementById('pf-ucont').value) || null;
    p.bulkDiscounts     = AdminView._readBulkDiscounts('edit-' + id);
    var catSel = document.getElementById('pf-cat-edit');
    if (catSel) {
      var newCatVal = catSel.value;
      if (newCatVal === '__new__') {
        var newCatInp = document.getElementById('pf-cat-new-edit');
        var newCatName = newCatInp ? newCatInp.value.trim() : '';
        if (!newCatName) { App.toast(t('admin.enterNewCat'), 'warning'); return; }
        newCatVal = newCatName.replace(/\s+/g, '_').toLowerCase();
        p.category = newCatVal;
        p.categoryLabel = newCatName;
      } else {
        var selOpt = catSel.options[catSel.selectedIndex];
        p.category = newCatVal;
        p.categoryLabel = selOpt ? selOpt.text : newCatVal;
      }
    }
    var subcatSel = document.getElementById('pf-subcat-edit');
    if (subcatSel) {
      var subcatVal = subcatSel.value;
      if (subcatVal === '__new__') {
        var subcatInp = document.getElementById('pf-subcat-new-edit');
        var subcatName = subcatInp ? subcatInp.value.trim() : '';
        if (!subcatName) { App.toast(t('admin.enterNewSubcat'), 'warning'); return; }
        p.subcategory = subcatName.replace(/\s+/g, '_').toLowerCase();
        p.subcategoryLabel = subcatName;
      } else if (subcatVal) {
        var subcatOpt = subcatSel.options[subcatSel.selectedIndex];
        p.subcategory = subcatVal;
        p.subcategoryLabel = subcatOpt ? subcatOpt.text : subcatVal;
      } else {
        p.subcategory = '';
        p.subcategoryLabel = '';
      }
    }
    if (window.DB) {
      window.DB.collection('products').doc(p.id).set(p)
        .catch(function (e) { console.warn('Firestore save error:', e); });
    }
    App.Store.set('products', PRODUCTS);
    App.closeModal();
    App.toast(t('admin.productUpdated'), 'success');
    App.checkLowStock(p);
    AdminView._products(document.getElementById('av-content'));
  },

  _delProd: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!confirm(t('admin.deleteProductConfirm') + pLang(p, 'name') + t('admin.cannotRestoreProduct'))) return;
    window.PRODUCTS = PRODUCTS.filter(function (x) { return x.id !== id; });
    App.Store.set('products', window.PRODUCTS);
    if (window.DB) {
      window.DB.collection('products').doc(id).delete()
        .catch(function (e) { console.warn('Firestore delete error:', e); });
    }
    App.toast(t('admin.productDeleted'), 'success');
    AdminView._products(document.getElementById('av-content'));
  },

  _saveNewProd: function () {
    var sku  = document.getElementById('pf-sku').value.trim();
    var name = document.getElementById('pf-name').value.trim();
    var catSel = document.getElementById('pf-cat');
    var cat  = catSel ? catSel.value : 'cups';
    if (!sku || !name) { App.toast(t('admin.skuNameRequired'), 'warning'); return; }

    var catLabel, catIcon;
    if (cat === '__new__') {
      var newCatInp = document.getElementById('pf-cat-new');
      var newCatName = newCatInp ? newCatInp.value.trim() : '';
      if (!newCatName) { App.toast(t('admin.enterNewCat'), 'warning'); return; }
      cat = newCatName.replace(/\s+/g, '_').toLowerCase();
      catLabel = newCatName;
      catIcon = '📦';
    } else {
      var catLabels = { cups:'כוסות', plates:'צלחות', napkins:'מפיות' };
      var catIcons  = { cups:'☕', plates:'🍽️', napkins:'🗒️' };
      var existingProd = PRODUCTS.find(function (p) { return p.category === cat; });
      catLabel = (catLabels[cat]) || (existingProd ? existingProd.categoryLabel : cat);
      catIcon  = (catIcons[cat])  || (existingProd ? existingProd.icon : '📦');
    }

    var subcat = '', subcatLabel = '';
    var subcatSel = document.getElementById('pf-subcat');
    if (subcatSel) {
      var subcatVal = subcatSel.value;
      if (subcatVal === '__new__') {
        var subcatInp = document.getElementById('pf-subcat-new');
        var subcatName = subcatInp ? subcatInp.value.trim() : '';
        if (!subcatName) { App.toast(t('admin.enterNewSubcat'), 'warning'); return; }
        subcat = subcatName.replace(/\s+/g, '_').toLowerCase();
        subcatLabel = subcatName;
      } else if (subcatVal) {
        var subcatOpt = subcatSel.options[subcatSel.selectedIndex];
        subcat = subcatVal;
        subcatLabel = subcatOpt ? subcatOpt.text : subcatVal;
      }
    }

    var newProd = {
      id:             'prod-' + sku,
      sku:            sku,
      name:           name,
      category:       cat,
      categoryLabel:  catLabel,
      subcategory:    subcat,
      subcategoryLabel: subcatLabel,
      price:          parseFloat(document.getElementById('pf-price').value) || 0,
      stock:          (function () { var n = parseInt(document.getElementById('pf-stock').value, 10); return Number.isNaN(n) ? 100 : n; })(),
      description:    document.getElementById('pf-desc').value || '',
      icon:           catIcon,
      bgColor:        '#1a2030',
      image:          null,
      unitsPerPackage:   parseInt(document.getElementById('pf-upkg').value) || null,
      soldBy:            document.getElementById('pf-soldby').value || null,
      unitsPerContainer: parseInt(document.getElementById('pf-ucont').value) || null,
      bulkDiscounts:     AdminView._readBulkDiscounts('new-prod'),
      name_en:              (document.getElementById('pf-name-en') || {}).value || '',
      description_en:       (document.getElementById('pf-desc-en') || {}).value || '',
      categoryLabel_en:     (document.getElementById('pf-catlabel-en') || {}).value || '',
      subcategoryLabel_en:  (document.getElementById('pf-subcatlabel-en') || {}).value || '',
      soldBy_en:            (document.getElementById('pf-soldby-en') || {}).value || ''
    };
    PRODUCTS.push(newProd);
    App.Store.set('products', PRODUCTS);
    if (window.DB) {
      window.DB.collection('products').doc(newProd.id).set(newProd)
        .catch(function (e) { console.warn('Firestore save error:', e); });
    }
    App.closeModal();
    App.toast(t('admin.productAdded'), 'success');
    AdminView._products(document.getElementById('av-content'));
  },

  _showImport: function () {
    var template = JSON.stringify([
      { sku: '1010', name: 'Product Name', category: 'cups', price: 99, stock: 100, unitsPerPackage: 100, soldBy: 'Carton', unitsPerContainer: 1000, description: 'Short desc', image: '' }
    ], null, 2);
    App.showModal(
      '<h3><span class="material-icons-round">upload_file</span> ' + t('admin.importTitle') + '</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">' + t('admin.importText') + '</p>' +
      '<textarea id="import-json" rows="10" style="width:100%;background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px;font-size:12px;font-family:monospace;direction:ltr;resize:vertical">' +
        template +
      '</textarea>' +
      '<div style="display:flex;gap:10px;margin-top:12px">' +
        '<button class="btn-primary" onclick="AdminView._runImport()">' +
          '<span class="material-icons-round">cloud_upload</span> ' + t('admin.importBtn') + '</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
      '</div>'
    );
  },

  _runImport: function () {
    var raw = document.getElementById('import-json').value.trim();
    var list;
    try { list = JSON.parse(raw); if (!Array.isArray(list)) throw new Error('not array'); }
    catch (e) { App.toast(t('admin.importError'), 'error'); return; }
    var catLabels = { cups: 'כוסות', plates: 'צלחות', napkins: 'מפיות' };
    var catIcons  = { cups: '☕', plates: '🍽️', napkins: '🗒️' };
    var catColors = { cups: '#2d1e14', plates: '#142d1e', napkins: '#1e142d' };
    var errors = []; var batch = window.DB ? window.DB.batch() : null;
    list.forEach(function (item, i) {
      if (!item.sku || !item.name || !item.category || item.price === undefined) {
        errors.push((i + 1) + ': ' + t('admin.importMissing')); return;
      }
      var prod = {
        id:             'prod-' + item.sku,
        sku:            String(item.sku),
        name:           item.name,
        category:       item.category,
        categoryLabel:  catLabels[item.category] || item.category,
        subcategory:    item.subcategory || '',
        subcategoryLabel: item.subcategoryLabel || item.subcategory || '',
        price:          parseFloat(item.price) || 0,
        stock:          parseInt(item.stock) || 0,
        description:    item.description || '',
        icon:           catIcons[item.category] || '📦',
        bgColor:        catColors[item.category] || '#1a2030',
        image:          item.image || null,
        unitsPerPackage:   parseInt(item.unitsPerPackage) || null,
        soldBy:            item.soldBy || null,
        unitsPerContainer: parseInt(item.unitsPerContainer) || null,
        bulkDiscounts:     item.bulkDiscounts || [],
        name_en:              item.name_en || '',
        description_en:       item.description_en || '',
        categoryLabel_en:     item.categoryLabel_en || '',
        subcategoryLabel_en:  item.subcategoryLabel_en || '',
        soldBy_en:            item.soldBy_en || ''
      };
      var existing = PRODUCTS.findIndex(function (p) { return p.id === prod.id; });
      if (existing > -1) PRODUCTS[existing] = prod; else PRODUCTS.push(prod);
      if (batch) { var ref = window.DB.collection('products').doc(prod.id); batch.set(ref, prod); }
    });
    if (errors.length) { App.toast(errors[0], 'error'); return; }
    App.Store.set('products', PRODUCTS);
    function finish() {
      App.closeModal();
      App.toast(t('admin.imported') + ' ' + list.length + ' ' + t('admin.importedProducts'), 'success');
      AdminView._products(document.getElementById('av-content'));
    }
    if (batch) batch.commit().then(finish).catch(function () { finish(); });
    else finish();
  },

  /* ===== QUOTE REQUESTS ===== */
  _quoteRequests: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';
    if (!window.DB) {
      c.innerHTML = '<div class="admin-section"><p style="color:var(--text-muted);padding:24px">' + t('admin.firestoreNotConnected') + '</p></div>';
      return;
    }
    window.DB.collection('quote_requests').orderBy('requestedAt', 'desc').get()
      .then(function (snap) {
        var requests = [];
        snap.forEach(function (d) { requests.push(Object.assign({ _id: d.id }, d.data())); });
        var pendingCount = requests.filter(function (r) { return r.status === 'pending'; }).length;
        var rows = requests.length ? requests.map(function (r) {
          var d = App.dateFmt(r.requestedAt);
          var statusBadge = r.status === 'approved'
            ? '<span style="background:var(--green-dim);color:var(--green);border-radius:12px;padding:2px 10px;font-size:12px">' + t('admin.quoteApproved') + '</span>'
            : '<span style="background:var(--orange-dim);color:var(--orange);border-radius:12px;padding:2px 10px;font-size:12px">' + t('admin.quotePending') + '</span>';
          return '<tr>' +
            '<td>' + d + '</td>' +
            '<td><strong>' + App.escHTML(AdminView._storedCustomerName(r)) + '</strong><div style="font-size:11px;color:var(--text-muted)">' + App.escHTML(r.customerPhone || '') + '</div></td>' +
            '<td>' + App.escHTML(r.productName) + '<div style="font-size:11px;color:var(--text-muted)">' + t('common.sku') + ' ' + App.escHTML(r.productSku || '') + '</div></td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + (r.approvedPrice ? '₪' + r.approvedPrice : '—') + '</td>' +
            '<td style="padding:8px">' +
              (r.status === 'pending'
                ? '<button class="btn-sm" onclick="AdminView._approveQuote(\'' + r._id + '\',\'' + r.customerId + '\',\'' + r.productId + '\')" title="' + t('admin.approvePrice') + '" style="background:var(--green-dim);color:var(--green)">' +
                    '<span class="material-icons-round">price_check</span></button>'
                : '') +
            '</td></tr>';
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">' + t('admin.noQuoteRequests') + '</td></tr>';

        c.innerHTML = '<div class="admin-section">' +
          '<div class="admin-section-header"><h2>' + t('admin.quoteRequestsTitle') +
            (pendingCount > 0 ? ' <span style="background:var(--orange);color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;margin-right:6px">' + pendingCount + ' ' + t('admin.quoteWaiting') + '</span>' : '') +
          '</h2><span style="font-size:13px;color:var(--text-muted)">' + requests.length + ' ' + t('admin.totalOrders') + '</span></div>' +
          '<div class="table-wrap"><table class="admin-table">' +
            '<thead><tr><th>' + t('common.date') + '</th><th>' + t('admin.customerCol') + '</th><th>' + t('admin.quoteRequestedProduct') + '</th><th>' + t('common.status') + '</th><th>' + t('admin.approvedPrice') + '</th><th>' + t('admin.action') + '</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div></div>';
      })
      .catch(function () {
        c.innerHTML = '<div class="admin-section"><p style="color:var(--red);padding:24px">' + t('admin.loadError') + '</p></div>';
      });
  },

  _approveQuote: function (requestId, customerId, productId) {
    App.showModal(
      '<h3><span class="material-icons-round">price_check</span> ' + t('admin.approveQuoteTitle') + '</h3>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>' + t('admin.personalPriceLabel') + '</label>' +
          '<input type="number" id="aq-price" placeholder="' + t('admin.enterPrice') + '" min="0" step="0.01" style="font-size:20px;font-weight:700"></div>' +
        '<div style="display:flex;gap:10px;margin-top:8px">' +
          '<button class="btn-primary" onclick="AdminView._confirmApproveQuote(\'' + requestId + '\',\'' + customerId + '\',\'' + productId + '\')">' +
            '<span class="material-icons-round">check</span> ' + t('admin.confirmApprove') + '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
        '</div>' +
      '</div>'
    );
    setTimeout(function () {
      var inp = document.getElementById('aq-price');
      if (inp) inp.focus();
    }, 100);
  },

  _confirmApproveQuote: function (requestId, customerId, productId) {
    var priceInp = document.getElementById('aq-price');
    var price    = priceInp ? parseFloat(priceInp.value) : NaN;
    if (isNaN(price) || price <= 0) { App.toast(t('admin.enterValidPrice'), 'warning'); return; }

    var cu = CUSTOMERS_DB.find(function (x) { return x.id === customerId; });
    if (cu) {
      if (!cu.personalPrices) cu.personalPrices = {};
      cu.personalPrices[productId] = price;
      DBSync.saveCustomer(cu);
    }

    if (window.DB) {
      window.DB.collection('quote_requests').doc(requestId).update({
        status: 'approved',
        approvedPrice: price,
        approvedAt: new Date().toISOString()
      }).catch(function (e) { console.warn('quote update error:', e); });
    }

    App.closeModal();
    App.toast(t('admin.priceApproved'), 'success');
    AdminView._quoteRequests(document.getElementById('av-content'));
  },

  /* ===== PRODUCT REQUESTS ===== */
  _productRequests: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';
    if (!window.DB) {
      c.innerHTML = '<div class="admin-section"><p style="color:var(--text-muted);padding:24px">' + t('admin.firestoreNotConnected') + '</p></div>';
      return;
    }
    window.DB.collection('product_requests').orderBy('requestedAt', 'desc').get()
      .then(function (snap) {
        var requests = [];
        snap.forEach(function (d) { requests.push(Object.assign({ _id: d.id }, d.data())); });
        var pendingCount = requests.filter(function (r) { return r.status === 'pending'; }).length;
        var rows = requests.length ? requests.map(function (r) {
          var d = App.dateFmt(r.requestedAt);
          var statusBadge = r.status === 'handled'
            ? '<span style="background:var(--green-dim);color:var(--green);border-radius:12px;padding:2px 10px;font-size:12px">' + t('admin.handled') + '</span>'
            : '<span style="background:var(--orange-dim);color:var(--orange);border-radius:12px;padding:2px 10px;font-size:12px">' + t('admin.quotePending') + '</span>';
          return '<tr>' +
            '<td>' + d + '</td>' +
            '<td><strong>' + App.escHTML(AdminView._storedCustomerName(r)) + '</strong><div style="font-size:11px;color:var(--text-muted)">' + App.escHTML(r.customerPhone || '') + '</div></td>' +
            '<td><strong>' + App.escHTML(r.productName) + '</strong>' + (r.estimatedQty ? '<div style="font-size:11px;color:var(--text-muted)">' + t('admin.estQty') + ' ' + r.estimatedQty + '</div>' : '') + '</td>' +
            '<td>' + App.escHTML(r.notes || '—') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td style="padding:8px">' +
              (r.status === 'pending'
                ? '<button class="btn-sm" onclick="AdminView._markProductRequestHandled(\'' + r._id + '\')" title="' + t('admin.markHandled') + '" style="background:var(--green-dim);color:var(--green)">' +
                    '<span class="material-icons-round">check_circle</span></button>'
                : '') +
            '</td></tr>';
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">' + t('admin.noProductRequests') + '</td></tr>';

        c.innerHTML = '<div class="admin-section">' +
          '<div class="admin-section-header"><h2>' + t('admin.productRequestsTitle') +
            (pendingCount > 0 ? ' <span style="background:var(--orange);color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;margin-right:6px">' + pendingCount + ' ' + t('admin.newRequests') + '</span>' : '') +
          '</h2><span style="font-size:13px;color:var(--text-muted)">' + requests.length + ' ' + t('admin.totalOrders') + '</span></div>' +
          '<div class="table-wrap"><table class="admin-table">' +
            '<thead><tr><th>' + t('common.date') + '</th><th>' + t('admin.customerCol') + '</th><th>' + t('admin.requestedProduct') + '</th><th>' + t('common.notes') + '</th><th>' + t('common.status') + '</th><th>' + t('admin.action') + '</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div></div>';
      })
      .catch(function () {
        c.innerHTML = '<div class="admin-section"><p style="color:var(--red);padding:24px">' + t('admin.loadError') + '</p></div>';
      });
  },

  _markProductRequestHandled: function (requestId) {
    if (!window.DB) return;
    window.DB.collection('product_requests').doc(requestId).update({ status: 'handled' })
      .then(function () {
        App.toast(t('admin.markedHandled'), 'success');
        AdminView._productRequests(document.getElementById('av-content'));
      })
      .catch(function () { App.toast(t('common.error'), 'error'); });
  },

  /* ===== STATISTICS ===== */
  _stats: function (c) {
    var orders = App.Orders.getAll();
    var now = new Date();
    var m = now.getMonth(), y = now.getFullYear();
    var monthly = orders.filter(function (o) { var d = new Date(o.timestamp); return d.getMonth() === m && d.getFullYear() === y; });
    var allTime  = orders;

    function topProduct(list) {
      var counts = {};
      list.forEach(function (o) {
        o.items.forEach(function (i) {
          if (i.product.sku === '1000') return;
          var k = i.product.sku + '|' + i.product.name;
          counts[k] = (counts[k] || 0) + i.qty;
        });
      });
      var keys = Object.keys(counts);
      if (!keys.length) return null;
      var top = keys.sort(function (a, b) { return counts[b] - counts[a]; })[0];
      return { name: top.split('|')[1], qty: counts[top] };
    }

    function topCustomer(list) {
      var totals = {};
      list.forEach(function (o) { totals[o.customerName] = (totals[o.customerName] || 0) + o.total; });
      var keys = Object.keys(totals);
      if (!keys.length) return null;
      var top = keys.sort(function (a, b) { return totals[b] - totals[a]; })[0];
      return { name: top, total: totals[top] };
    }

    var mRevenue   = monthly.reduce(function (s, o) { return s + o.total; }, 0);
    var mOrders    = monthly.length;
    var mTopProd   = topProduct(monthly);
    var mTopCust   = topCustomer(monthly);
    var allRevenue = allTime.reduce(function (s, o) { return s + o.total; }, 0);
    var allTopProd = topProduct(allTime);
    var allTopCust = topCustomer(allTime);

    function statCard(icon, label, value, sub) {
      return '<div class="stat-card"><span class="material-icons-round">' + icon + '</span>' +
        '<div><div class="stat-val">' + value + '</div><div class="stat-label">' + label + '</div>' +
        (sub ? '<div class="stat-sub">' + sub + '</div>' : '') + '</div></div>';
    }

    var locale = I18n.getLang() === 'en' ? 'en-US' : 'he-IL';

    c.innerHTML =
      '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>' + t('admin.statsTitle') + '</h2>' +
          '<span style="font-size:13px;color:var(--text-muted)">' + now.toLocaleDateString(locale, {month:'long', year:'numeric'}) + '</span>' +
        '</div>' +
        '<h3 style="font-size:14px;color:var(--text-muted);margin-bottom:10px">' + t('admin.thisMonth') + '</h3>' +
        '<div class="stats-grid">' +
          statCard('payments', t('admin.monthlyIncome'), '₪' + App.fmtP(mRevenue), mOrders + ' ' + t('admin.ordersCount')) +
          statCard('star', t('admin.topProduct'), mTopProd ? mTopProd.name : '—', mTopProd ? mTopProd.qty + ' ' + t('common.units') : '') +
          statCard('emoji_events', t('admin.topCustomer'), mTopCust ? AdminView._statsCustomerLabel(mTopCust.name) : '—', mTopCust ? '₪' + App.fmtP(mTopCust.total) : '') +
        '</div>' +
        '<h3 style="font-size:14px;color:var(--text-muted);margin:20px 0 10px">' + t('admin.allTime') + '</h3>' +
        '<div class="stats-grid">' +
          statCard('account_balance', t('admin.totalIncome'), '₪' + App.fmtP(allRevenue), allTime.length + ' ' + t('admin.ordersCount')) +
          statCard('inventory_2', t('admin.topProduct'), allTopProd ? allTopProd.name : '—', allTopProd ? allTopProd.qty + ' ' + t('common.units') : '') +
          statCard('workspace_premium', t('admin.topCustomer'), allTopCust ? AdminView._statsCustomerLabel(allTopCust.name) : '—', allTopCust ? '₪' + App.fmtP(allTopCust.total) : '') +
        '</div>' +
      '</div>';
  },

  /* ===== SETTINGS ===== */
  _settings: function (c) {
    var s = App.state.settings;
    c.innerHTML =
      '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>' + t('admin.settingsTitle') + '</h2></div>' +
        '<div class="settings-grid">' +
          AdminView._fld(t('admin.minOrder'), 'sv-min', s.minOrderAmount, 'number') +
          AdminView._fld(t('admin.defaultShipping'), 'sv-ship', s.defaultShippingCost, 'number') +
          '<div class="form-group full-width"><label>' + t('admin.systemMsg') + '</label>' +
            '<textarea id="sv-sysmsg" rows="3">' + (s.systemMessage || '') + '</textarea></div>' +
          '<div class="form-group full-width"><label>' + t('admin.landingTitle') + '</label>' +
            '<input type="text" id="sv-title" value="' + App.escHTML(s.landingTitle || '') + '"></div>' +
          '<div class="form-group full-width"><label>' + t('admin.landingSubtitle') + '</label>' +
            '<textarea id="sv-sub" rows="2">' + (s.landingSubtitle || '') + '</textarea></div>' +
          '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;margin-top:8px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
              '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">' + t('admin.settingsOpeningEn') + '</p>' +
              '<button type="button" onclick="AdminView._translateSettingsOpening()" style="background:var(--blue);color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;border:none;cursor:pointer"><span class="material-icons-round" style="font-size:15px">translate</span> ' + t('admin.translateOpeningAll') + '</button>' +
            '</div>' +
            '<div class="form-group full-width"><label>' + t('admin.systemMsgEn') + '</label>' +
              '<textarea id="sv-sysmsg-en" rows="3" dir="ltr" style="text-align:left">' + (s.systemMessage_en || '') + '</textarea></div>' +
            '<div class="form-group full-width"><label>' + t('admin.landingTitleEn') + '</label>' +
              '<input type="text" id="sv-title-en" value="' + App.escHTML(s.landingTitle_en || '') + '" dir="ltr" style="text-align:left"></div>' +
            '<div class="form-group full-width"><label>' + t('admin.landingSubtitleEn') + '</label>' +
              '<textarea id="sv-sub-en" rows="2" dir="ltr" style="text-align:left">' + (s.landingSubtitle_en || '') + '</textarea></div>' +
          '</div>' +
          AdminView._fld(t('admin.adminPin'), 'sv-pin', s.adminPin, 'password') +
        '</div>' +
        '<button class="btn-primary" onclick="AdminView._saveSettings()">' +
          '<span class="material-icons-round">save</span> ' + t('admin.saveSettings') +
        '</button>' +
      '</div>';
  },

  _translateSettingsOpening: function () {
    AutoTranslate.translateAll([
      ['sv-sysmsg', 'sv-sysmsg-en'],
      ['sv-title', 'sv-title-en'],
      ['sv-sub', 'sv-sub-en']
    ]);
  },

  _saveSettings: function () {
    var s = App.state.settings;
    s.minOrderAmount       = parseInt(document.getElementById('sv-min').value)  || s.minOrderAmount;
    s.defaultShippingCost  = parseInt(document.getElementById('sv-ship').value) || s.defaultShippingCost;
    s.systemMessage        = document.getElementById('sv-sysmsg').value;
    s.landingTitle         = document.getElementById('sv-title').value;
    s.landingSubtitle      = document.getElementById('sv-sub').value;
    s.systemMessage_en     = (document.getElementById('sv-sysmsg-en') || {}).value || '';
    s.landingTitle_en      = (document.getElementById('sv-title-en') || {}).value || '';
    s.landingSubtitle_en   = (document.getElementById('sv-sub-en') || {}).value || '';
    var pin = document.getElementById('sv-pin').value;
    if (pin && pin.length >= 4) {
      s.adminPin = pin;
    } else if (pin && pin.length > 0 && pin.length < 4) {
      App.toast(t('admin.pinTooShort'), 'warning');
      return;
    }
    App.saveSettings();
    App.toast(t('admin.settingsSaved'), 'success');
  }
};
