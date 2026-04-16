var AdminView = {
  _tab: 'orders',
  _ordersUnsub: null,
  _lastOrders: [],

  render: function (el, params) {
    params = params || {};
    if (params.tab) AdminView._tab = params.tab;
    var tabs = [
      { id: 'orders',          label: 'הזמנות',             icon: 'list_alt' },
      { id: 'customers',       label: 'לקוחות',             icon: 'people' },
      { id: 'products',        label: 'מוצרים',             icon: 'inventory_2' },
      { id: 'suppliers',       label: 'ספקים',              icon: 'local_shipping' },
      { id: 'quote_requests',  label: 'הצעות מחיר',         icon: 'request_quote' },
      { id: 'product_requests',label: 'בקשות מוצרים',       icon: 'add_circle' },
      { id: 'profit',          label: 'רווח',                icon: 'trending_up' },
      { id: 'stats',           label: 'סטטיסטיקות',         icon: 'bar_chart' },
      { id: 'financial',       label: 'פיננסי',             icon: 'account_balance_wallet' },
      { id: 'settings',        label: 'הגדרות',             icon: 'settings' }
    ];
    el.innerHTML =
      '<div class="admin-page"><div class="container">' +
        '<h1 class="admin-title"><span class="material-icons-round">admin_panel_settings</span> פאנל ניהול — ישיר</h1>' +
        '<div class="admin-tabs">' +
          tabs.map(function (t) {
            return '<button class="admin-tab' + (AdminView._tab === t.id ? ' active' : '') + '" onclick="AdminView.tab(\'' + t.id + '\')">' +
              '<span class="material-icons-round">' + t.icon + '</span> ' + t.label + '</button>';
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
    var SL = { new:'חדש', processing:'בטיפול', ready:'מוכן למשלוח', shipped:'יצא למשלוח', delivered:'הגיע ללקוח' };
    var SC = { new:'var(--orange)', processing:'var(--blue)', ready:'#8b5cf6', shipped:'#06b6d4', delivered:'#22c55e' };

    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';

    if (AdminView._ordersUnsub) { AdminView._ordersUnsub(); AdminView._ordersUnsub = null; }

    function renderOrders(all) {
      AdminView._lastOrders = all;
      var newCount = all.filter(function (o) { return o.status === 'new'; }).length;
      var rows = all.length ? all.map(function (o) {
        var d = new Date(o.timestamp).toLocaleDateString('he-IL');
        var paid = o.paymentStatus === 'paid';
        var ph = (o.customerPhone || '').replace(/'/g, '');
        var sOpts = Object.keys(SL).map(function (s) {
          return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + SL[s] + '</option>';
        }).join('');
        return '<tr>' +
          '<td><strong>' + o.id + '</strong></td>' +
          '<td><div>' + App.escHTML(o.customerName) + '</div>' +
            (o.customerPhone ? '<div style="font-size:11px;color:var(--text-muted)">' + App.escHTML(o.customerPhone) + '</div>' : '') +
          '</td>' +
          '<td>' + d + '</td>' +
          '<td><div style="color:var(--text-muted);font-size:12px">לפני מע"מ: ₪' + o.subtotal + '</div>' +
               '<div style="color:var(--blue);font-weight:700">כולל מע"מ: ₪' + o.total + '</div></td>' +
          '<td><select onchange="AdminView._setStatus(\'' + o.id + '\',this.value,\'' + ph + '\')" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;color:' + (SC[o.status] || 'var(--text)') + '">' + sOpts + '</select></td>' +
          '<td><button class="btn-sm" onclick="AdminView._togglePayment(\'' + o.id + '\',\'' + (o.paymentStatus||'unpaid') + '\')" style="font-size:11px;white-space:nowrap">' +
            (paid ? '✅ שולם' : '⏳ ממתין') + '</button></td>' +
          '<td style="display:flex;gap:4px;padding:8px;flex-wrap:wrap">' +
            '<button class="btn-sm" title="צפה" onclick="AdminView._viewOrder(\'' + o.id + '\')"><span class="material-icons-round">visibility</span></button>' +
            '<button class="btn-sm" title="תעודה" onclick="SuccessView.printNote(\'' + o.id + '\')"><span class="material-icons-round">print</span></button>' +
            (ph ? '<button class="btn-sm" title="WhatsApp" onclick="AdminView._waOrder(\'' + o.id + '\',\'' + ph + '\')" style="background:#25d366;color:#fff"><span class="material-icons-round">chat</span></button>' : '') +
            '<button class="btn-sm danger" title="מחק הזמנה" onclick="AdminView._delOrder(\'' + o.id + '\')"><span class="material-icons-round">delete</span></button>' +
          '</td></tr>';
      }).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">אין הזמנות עדיין</td></tr>';

      c.innerHTML = '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>הזמנות' +
          (newCount > 0 ? ' <span style="background:var(--orange);color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;margin-right:6px">' + newCount + ' חדשות</span>' : '') +
        '</h2><span style="font-size:13px;color:var(--text-muted)">' + all.length + ' סה"כ</span></div>' +
        '<div class="table-wrap"><table class="admin-table">' +
          '<thead><tr><th>מספר</th><th>לקוח</th><th>תאריך</th><th>סה"כ</th><th>סטטוס</th><th>תשלום</th><th>פעולות</th></tr></thead>' +
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
    App.toast('סטטוס עודכן', 'success');
  },

  _togglePayment: function (orderId, current) {
    var next = current === 'paid' ? 'unpaid' : 'paid';
    App.updateOrderPayment(orderId, next);
    App.toast(next === 'paid' ? 'סומן כשולם ✅' : 'סומן כממתין', next === 'paid' ? 'success' : 'info');
  },

  _waOrder: function (orderId, phone) {
    var SL = { new:'חדש', processing:'בטיפול', ready:'מוכן למשלוח', shipped:'יצא למשלוח', delivered:'הגיע ללקוח' };
    var o = (AdminView._lastOrders || []).find(function (x) { return String(x.id) === String(orderId); })
          || (App.Orders.getAll()).find(function (x) { return String(x.id) === String(orderId); });
    var ph = phone.replace(/\D/g, '');
    if (ph.startsWith('0')) ph = '972' + ph.substring(1);
    var msg = o ? '📦 הזמנה #' + o.id + '\nלקוח: ' + o.customerName + '\nסה"כ: ₪' + o.total + '\nסטטוס: ' + (SL[o.status] || o.status)
                : 'פרטי הזמנה #' + orderId;
    window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank');
  },

  _checkNewOrders: function () {
    if (!window.DB) return;
    window.DB.collection('orders').where('status', '==', 'new').get()
      .then(function (snap) {
        if (snap.empty) return;
        App.showModal(
          '<div class="sys-message">' +
            '<div class="sys-icon" style="background:var(--orange-dim)"><span class="material-icons-round" style="font-size:30px;color:var(--orange)">notifications_active</span></div>' +
            '<h3>' + snap.size + ' הזמנות חדשות ממתינות!</h3>' +
            '<p>ישנן הזמנות חדשות שטרם טופלו.</p>' +
            '<div style="display:flex;gap:10px;margin-top:12px">' +
              '<button class="btn-primary" onclick="App.closeModal();AdminView.tab(\'orders\')">צפה בהזמנות</button>' +
              '<button class="btn-secondary" onclick="App.closeModal()">לאחר כך</button>' +
            '</div>' +
          '</div>'
        );
      }).catch(function () {});
  },

  _delOrder: function (orderId) {
    if (!confirm('למחוק הזמנה #' + orderId + '? לא ניתן לשחזר.')) return;
    var all = App.Orders.getAll();
    var filtered = all.filter(function (x) { return String(x.id) !== String(orderId); });
    App.Store.set('orders', filtered);
    if (window.DB) {
      window.DB.collection('orders').doc(String(orderId)).delete()
        .catch(function (e) { console.warn('Firestore delete order error:', e); });
    }
    App.toast('ההזמנה נמחקה', 'success');
    AdminView._orders(document.getElementById('av-content'));
  },

  _viewOrder: function (orderId) {
    var o = (AdminView._lastOrders || []).find(function (x) { return String(x.id) === String(orderId); })
          || (App.Orders.getAll()).find(function (x) { return String(x.id) === String(orderId); });
    if (!o) { App.toast('הזמנה לא נמצאה', 'error'); return; }
    var rows = o.items.map(function (i) {
      return '<tr><td>' + i.product.sku + '</td><td>' + i.product.name + '</td><td>' + i.qty + '</td>' +
        '<td>' + App.fmtP(i.discountPct) + '%</td><td>₪' + App.fmtP(i.unitPrice * i.qty) + '</td></tr>';
    }).join('');
    App.showModal(
      '<h3>הזמנה #' + o.id + ' — ' + App.escHTML(o.customerName) + '</h3>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>מק"ט</th><th>מוצר</th><th>כמות</th><th>הנחה</th><th>סה"כ</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="order-totals">' +
        '<div>לפני מע"מ: ₪' + o.subtotal + '</div>' +
        '<div>מע"מ: ₪' + o.vat + '</div>' +
        '<div style="font-weight:700;font-size:16px">סה"כ כולל מע"מ: ₪' + o.total + '</div>' +
        (o.savings > 0 ? '<div style="color:var(--green)">חסכון: ₪' + o.savings + '</div>' : '') +
      '</div>' +
      (o.notes ? '<p style="margin-top:8px;font-size:14px;color:var(--text-muted)"><strong>הערות:</strong> ' + App.escHTML(o.notes) + '</p>' : '') +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="SuccessView.printNote(' + o.id + ');App.closeModal()">' +
          '<span class="material-icons-round">print</span> תעודת משלוח</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">סגור</button>' +
      '</div>'
    );
  },

  /* ===== CUSTOMERS ===== */
  _customers: function (c) {
    var rows = CUSTOMERS_DB.map(function (cu) {
      var debt = cu.existingDebt || 0;
      return '<tr>' +
        '<td><code style="font-size:12px">' + cu.id + '</code></td>' +
        '<td><strong>' + App.escHTML(cu.name) + '</strong></td>' +
        '<td>' + (cu.phone || '—') + '</td>' +
        '<td>' + (cu.generalDiscount || 0) + '%</td>' +
        '<td>' + (cu.paymentTerms || 'מזומן') + '</td>' +
        '<td style="color:' + (debt > 0 ? 'var(--orange)' : 'inherit') + ';font-weight:' + (debt > 0 ? '700' : '400') + '">₪' + debt + '</td>' +
        '<td>' + Object.keys(cu.personalPrices || {}).length + ' מוצרים</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminView._editCust(\'' + cu.id + '\')" title="ערוך"><span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminView._custPrices(\'' + cu.id + '\')" title="מחירים אישיים"><span class="material-icons-round">price_change</span></button>' +
          '<button class="btn-sm danger" onclick="AdminView._delCust(\'' + cu.id + '\')" title="מחק"><span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('');

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>לקוחות</h2>' +
        '<button class="btn-primary" onclick="AdminView._editCust(null)">' +
          '<span class="material-icons-round">person_add</span> הוסף לקוח</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>ח.פ</th><th>שם</th><th>טלפון</th><th>הנחה</th><th>תנאי תשלום</th><th>חוב קיים</th><th>מחירים</th><th>פעולות</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
  },

  _fld: function (label, id, value, type, disabled) {
    return '<div class="form-group"><label>' + label + '</label>' +
      '<input type="' + (type || 'text') + '" id="' + id + '" value="' + (value || '') + '"' + (disabled ? ' disabled style="opacity:.5"' : '') + '></div>';
  },

  _editCust: function (id) {
    var isNew = !id;
    var cu = isNew
      ? { id:'', name:'', email:'', phone:'', address:'', contactPerson:'', shippingAddress:'', generalDiscount:0, shippingCost:45, paymentTerms:'מזומן', existingDebt:0, personalPrices:{} }
      : CUSTOMERS_DB.find(function (x) { return x.id === id; }) || {};
    var termsOpts = ['מזומן','שוטף 30','שוטף 60','שוטף 90','שוטף+30','שוטף+60'].map(function (t) {
      return '<option value="' + t + '"' + (cu.paymentTerms === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
    App.showModal(
      '<h3>' + (isNew ? 'הוסף לקוח חדש' : 'עריכת ' + cu.name) + '</h3>' +
      '<div class="customer-form">' +
        /* ח.פ תמיד ניתן לעריכה */
        AdminView._fld('ח.פ / עוסק מורשה', 'ef-id', cu.id, 'text') +
        (isNew ? '' : '<p style="font-size:12px;color:var(--orange);margin-top:-8px">⚠️ שינוי ח.פ ישנה את מזהה הלקוח בכל המערכת</p>') +
        AdminView._fld('שם עסק', 'ef-name', cu.name, 'text') +
        AdminView._fld('טלפון', 'ef-phone', cu.phone, 'tel') +
        AdminView._fld('מייל', 'ef-email', cu.email, 'email') +
        AdminView._fld('כתובת', 'ef-address', cu.address, 'text') +
        AdminView._fld('איש קשר למשלוח', 'ef-contact', cu.contactPerson, 'text') +
        AdminView._fld('כתובת למשלוח', 'ef-shaddr', cu.shippingAddress, 'text') +
        AdminView._fld('הנחה כללית (%)', 'ef-disc', cu.generalDiscount, 'number') +
        AdminView._fld('דמי משלוח אישיים (₪)', 'ef-ship', cu.shippingCost, 'number') +
        AdminView._fld('חוב קיים (₪)', 'ef-debt', cu.existingDebt || 0, 'number') +
        '<div class="form-group"><label>תנאי תשלום</label>' +
          '<select id="ef-terms" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
            termsOpts +
          '</select></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminView._saveCust(\'' + (id || '') + '\')">' +
            '<span class="material-icons-round">save</span> שמור</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveCust: function (origId) {
    var id   = document.getElementById('ef-id').value.trim();
    var name = document.getElementById('ef-name').value.trim();
    if (!id || !name) { App.toast('ח.פ ושם חובה', 'warning'); return; }
    var duplicate = CUSTOMERS_DB.find(function (x) { return x.id === id && x.id !== origId; });
    if (duplicate) { App.toast('ח.פ ' + id + ' כבר קיים במערכת', 'error'); return; }
    var existing = origId ? CUSTOMERS_DB.find(function (x) { return x.id === origId; }) : null;
    var data = {
      id: id, name: name,
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
      /* עדכון ח.פ בהזמנות קיימות */
      var allOrders = App.Store.get('orders') || [];
      var updated = false;
      allOrders.forEach(function (o) {
        if (String(o.customerId) === String(origId)) { o.customerId = id; updated = true; }
      });
      if (updated) App.Store.set('orders', allOrders);
      /* ניקוי עגלה שמורה בח.פ הישן */
      App.Store.del('cart_' + origId);
    } else if (origId) {
      var idx = CUSTOMERS_DB.findIndex(function (x) { return x.id === origId; });
      if (idx > -1) CUSTOMERS_DB[idx] = data; else CUSTOMERS_DB.push(data);
    } else {
      CUSTOMERS_DB.push(data);
    }
    DBSync.saveCustomer(data);
    App.closeModal();
    App.toast('הלקוח נשמר ✅', 'success');
    AdminView._customers(document.getElementById('av-content'));
  },

  _delCust: function (id) {
    if (!confirm('למחוק לקוח ' + id + '?')) return;
    window.CUSTOMERS_DB = CUSTOMERS_DB.filter(function (x) { return x.id !== id; });
    DBSync.deleteCustomer(id);
    App.toast('הלקוח נמחק', 'success');
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
        '<span style="flex:1">' + p.name + '</span>' +
        '<span class="base-price-hint">כללי: ₪' + p.price + '</span>' +
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
      '<h3>מחירים אישיים — ' + cu.name + '</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">הזן מחיר ב-₪ <strong>או</strong> הנחה ב-%. הלקוח יראה את ההנחה באחוזים.</p>' +
      '<div class="personal-prices-grid">' + rows + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="AdminView._savePrices(\'' + custId + '\')">' +
          '<span class="material-icons-round">save</span> שמור מחירים</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
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
    App.toast('המחירים האישיים נשמרו ✅', 'success');
  },

  /* ===== PRODUCTS ===== */
  _products: function (c) {
    var rows = PRODUCTS.map(function (p) {
      var thumb = p.image
        ? '<img src="' + CloudinaryUpload.buildThumbUrl(p.image) + '" alt="' + p.name + '" loading="lazy" style="width:60px;height:44px;object-fit:cover;border-radius:6px;display:block">'
        : '<span style="font-size:26px;display:block;text-align:center">' + p.icon + '</span>';
      var hasBulk = p.bulkDiscounts && p.bulkDiscounts.length > 0;
      return '<tr>' +
        '<td><code>' + p.sku + '</code></td>' +
        '<td style="display:flex;align-items:center;gap:10px;padding:8px 14px">' + thumb + '<span>' + App.escHTML(p.name) + '</span></td>' +
        '<td>' + p.categoryLabel + '</td>' +
        '<td style="color:var(--blue);font-weight:700">₪' + p.price + '</td>' +
        '<td>' + (p.soldBy ? p.soldBy : '—') + (p.unitsPerPackage ? ' / ' + p.unitsPerPackage + ' יח׳' : '') + '</td>' +
        '<td>' + (hasBulk ? '<span style="color:var(--green);font-size:12px">✓ יש</span>' : '—') + '</td>' +
        '<td>' + (p.stock > 0 ? p.stock : '<span style="color:var(--red)">0 — חסר</span>') + '</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminView._editProd(\'' + p.id + '\')" title="ערוך">' +
            '<span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminView._quickUpload(\'' + p.id + '\')" title="העלה תמונה" style="background:var(--orange-dim);color:var(--orange)">' +
            '<span class="material-icons-round">add_photo_alternate</span></button>' +
          '<button class="btn-sm danger" onclick="AdminView._delProd(\'' + p.id + '\')" title="מחק מוצר">' +
            '<span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('');

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>מוצרים</h2>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn-primary" onclick="AdminView._addProd()">' +
            '<span class="material-icons-round">add</span> הוסף מוצר</button>' +
          '<button class="btn-secondary" onclick="AdminView._showImport()" style="font-size:13px">' +
            '<span class="material-icons-round">upload_file</span> ייבוא JSON</button>' +
        '</div>' +
      '</div>' +
      '<p class="admin-note">תאריך עדכון אחרון: ' + new Date().toLocaleDateString('he-IL') + ' | Cloud: dmqjap7r1</p>' +
      '<input type="file" id="quick-upload-input" accept="image/*" style="display:none" onchange="AdminView._handleQuickUpload(this)">' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>מק"ט</th><th>שם</th><th>קטגוריה</th><th>מחיר</th><th>אריזה</th><th>הנחת כמות</th><th>מלאי</th><th>פעולות</th></tr></thead>' +
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
    App.toast('מעלה תמונה...', 'info');
    AdminView._doUpload(file, productId, function () {
      App.toast('✓ התמונה הועלתה בהצלחה', 'success');
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
        App.toast('שגיאה: ' + msg, 'error');
        var bar = document.getElementById('upload-progress-' + productId);
        if (bar) bar.style.display = 'none';
      }
    });
  },

  _bulkDiscountsEditor: function (bulkDiscounts, containerId) {
    var discounts = bulkDiscounts || [];
    var rows = discounts.map(function (d, i) {
      return '<div class="bulk-row" id="bdr-' + containerId + '-' + i + '">' +
        '<span style="font-size:13px;color:var(--text-muted)">מ-</span>' +
        '<input type="number" id="bd-qty-' + containerId + '-' + i + '" value="' + d.minQty + '" min="1" placeholder="כמות" style="width:70px">' +
        '<span style="font-size:13px;color:var(--text-muted)">יח׳ הנחה</span>' +
        '<input type="number" id="bd-pct-' + containerId + '-' + i + '" value="' + d.discountPct + '" min="1" max="99" placeholder="%" style="width:60px">' +
        '<span style="font-size:13px;color:var(--text-muted)">%</span>' +
        '<button onclick="document.getElementById(\'bdr-' + containerId + '-' + i + '\').remove()" style="background:var(--red-dim);color:var(--red);border-radius:4px;padding:4px 8px;font-size:12px">' +
          '<span class="material-icons-round" style="font-size:14px">delete</span>' +
        '</button>' +
      '</div>';
    }).join('');
    return '<div class="form-group">' +
      '<label>הנחת כמות</label>' +
      '<div id="bulk-rows-' + containerId + '" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">' + rows + '</div>' +
      '<button onclick="AdminView._addBulkRow(\'' + containerId + '\')" style="background:var(--blue-dim);color:var(--blue);border-radius:6px;padding:7px 14px;font-size:13px;font-weight:700;border:1px solid var(--border-blue)">' +
        '<span class="material-icons-round" style="font-size:15px">add</span> הוסף שלב הנחה' +
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
      '<span style="font-size:13px;color:var(--text-muted)">מ-</span>' +
      '<input type="number" id="bd-qty-' + containerId + '-' + idx + '" value="" min="1" placeholder="כמות" style="width:70px">' +
      '<span style="font-size:13px;color:var(--text-muted)">יח׳ הנחה</span>' +
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

  _editProd: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var previewUrl = p.image ? CloudinaryUpload.buildCatalogUrl(p.image) : null;
    var threshold  = p.lowStockThreshold != null ? p.lowStockThreshold : 10;
    var soldByOpts = ['קרטון','שק','מארז','חבילה','ארגז','פלטה'].map(function (o) {
      return '<option value="' + o + '"' + (p.soldBy === o ? ' selected' : '') + '>' + o + '</option>';
    }).join('');

    /* בנה רשימת קטגוריות קיימות */
    var catSet = {};
    PRODUCTS.forEach(function (x) {
      if (x.category && x.category !== 'shipping') catSet[x.category] = x.categoryLabel || x.category;
    });
    var catOpts = Object.keys(catSet).map(function (k) {
      return '<option value="' + k + '"' + (p.category === k ? ' selected' : '') + '>' + catSet[k] + '</option>';
    }).join('');

    App.showModal(
      '<h3>עריכת מוצר — ' + p.icon + ' ' + p.name + '</h3>' +
      '<div class="customer-form">' +
        AdminView._fld('שם מוצר', 'pf-name', p.name) +
        AdminView._fld('מחיר כללי (₪) — לפני מע"מ', 'pf-price', p.price, 'number') +
        AdminView._fld('מלאי', 'pf-stock', p.stock, 'number') +
        AdminView._fld('סף מלאי נמוך', 'pf-threshold', threshold, 'number') +
        AdminView._fld('תיאור', 'pf-desc', p.description) +
        '<div class="form-group"><label>קטגוריה</label>' +
          '<select id="pf-cat-edit" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%" onchange="AdminView._onCatEditChange()">' +
            catOpts +
            '<option value="__new__">➕ קטגוריה חדשה...</option>' +
          '</select>' +
          '<input type="text" id="pf-cat-new-edit" placeholder="שם הקטגוריה החדשה" style="display:none;margin-top:6px;background:var(--input-bg);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
        '</div>' +
        /* ===== שדות אריזה ===== */
        '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;">' +
          '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">פרטי אריזה ומכירה</p>' +
          AdminView._fld('כמה יחידות בחבילה', 'pf-upkg', p.unitsPerPackage || '', 'number') +
          '<div class="form-group"><label>נמכר ב...</label>' +
            '<select id="pf-soldby" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
              '<option value="">-- בחר --</option>' + soldByOpts +
            '</select></div>' +
          AdminView._fld('כמה יחידות בקרטון/מארז/שק', 'pf-ucont', p.unitsPerContainer || '', 'number') +
          AdminView._bulkDiscountsEditor(p.bulkDiscounts, 'edit-' + id) +
        '</div>' +
        /* ===== תמונה ===== */
        '<div class="form-group" style="gap:10px">' +
          '<label>תמונת מוצר</label>' +
          '<div id="img-preview-wrap" style="margin-bottom:8px">' +
            (previewUrl
              ? '<img id="img-preview-' + id + '" src="' + previewUrl + '" alt="תצוגה מקדימה" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1.5px solid var(--border)">'
              : '<div id="img-preview-' + id + '" style="display:none"></div>' +
                '<div style="padding:20px;text-align:center;background:var(--navy-dark);border-radius:10px;border:1.5px dashed var(--border);color:var(--text-muted);font-size:14px">' +
                '<span class="material-icons-round" style="font-size:32px;display:block;margin-bottom:6px">image</span>אין תמונה עדיין</div>') +
          '</div>' +
          '<label class="upload-btn-label" style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--blue-dim);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;font-weight:700;color:var(--blue)">' +
            '<span class="material-icons-round">add_photo_alternate</span> בחר תמונה מהמחשב' +
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
            '<span class="material-icons-round">save</span> שמור פרטים</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">סגור</button>' +
        '</div>' +
      '</div>'
    );
  },

  _handleEditUpload: function (productId, input) {
    if (!input.files || !input.files[0]) return;
    AdminView._doUpload(input.files[0], productId, function () {
      App.toast('✓ התמונה הועלתה וחוברה למוצר', 'success');
    });
  },

  _onCatEditChange: function () {
    var sel = document.getElementById('pf-cat-edit');
    var inp = document.getElementById('pf-cat-new-edit');
    if (!sel || !inp) return;
    inp.style.display = sel.value === '__new__' ? 'block' : 'none';
  },

  _onCatAddChange: function () {
    var sel = document.getElementById('pf-cat');
    var inp = document.getElementById('pf-cat-new');
    if (!sel || !inp) return;
    inp.style.display = sel.value === '__new__' ? 'block' : 'none';
  },

  _addProd: function () {
    var soldByOpts = ['קרטון','שק','מארז','חבילה','ארגז','פלטה'].map(function (o) {
      return '<option value="' + o + '">' + o + '</option>';
    }).join('');

    /* בנה רשימת קטגוריות קיימות */
    var catSet = {};
    PRODUCTS.forEach(function (x) {
      if (x.category && x.category !== 'shipping') catSet[x.category] = x.categoryLabel || x.category;
    });
    /* ודא שיש לפחות ברירות מחדל */
    if (!catSet['cups'])    catSet['cups']    = 'כוסות';
    if (!catSet['plates'])  catSet['plates']  = 'צלחות';
    if (!catSet['napkins']) catSet['napkins'] = 'מפיות';
    var catOpts = Object.keys(catSet).map(function (k) {
      return '<option value="' + k + '">' + catSet[k] + '</option>';
    }).join('');

    App.showModal(
      '<h3>הוסף מוצר חדש</h3>' +
      '<div class="customer-form">' +
        AdminView._fld('מק"ט (מספר)', 'pf-sku', '', 'text') +
        AdminView._fld('שם מוצר', 'pf-name', '') +
        AdminView._fld('מחיר (₪) — לפני מע"מ', 'pf-price', '', 'number') +
        AdminView._fld('מלאי', 'pf-stock', '100', 'number') +
        AdminView._fld('תיאור', 'pf-desc', '') +
        '<div class="form-group"><label>קטגוריה</label>' +
          '<select id="pf-cat" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%" onchange="AdminView._onCatAddChange()">' +
            catOpts +
            '<option value="__new__">➕ קטגוריה חדשה...</option>' +
          '</select>' +
          '<input type="text" id="pf-cat-new" placeholder="שם הקטגוריה החדשה" style="display:none;margin-top:6px;background:var(--input-bg);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
        '</div>' +
        '<div style="background:var(--navy-dark);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:12px;">' +
          '<p style="font-size:13px;font-weight:700;color:var(--blue);margin:0">פרטי אריזה ומכירה</p>' +
          AdminView._fld('כמה יחידות בחבילה', 'pf-upkg', '', 'number') +
          '<div class="form-group"><label>נמכר ב...</label>' +
            '<select id="pf-soldby" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
              '<option value="">-- בחר --</option>' + soldByOpts +
            '</select></div>' +
          AdminView._fld('כמה יחידות בקרטון/מארז/שק', 'pf-ucont', '', 'number') +
          AdminView._bulkDiscountsEditor([], 'new-prod') +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminView._saveNewProd()">' +
            '<span class="material-icons-round">add</span> הוסף</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
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
    p.lowStockThreshold = parseInt(document.getElementById('pf-threshold') && document.getElementById('pf-threshold').value) || 10;
    p.description       = document.getElementById('pf-desc').value || p.description;
    p.unitsPerPackage   = parseInt(document.getElementById('pf-upkg').value) || null;
    p.soldBy            = document.getElementById('pf-soldby').value || null;
    p.unitsPerContainer = parseInt(document.getElementById('pf-ucont').value) || null;
    p.bulkDiscounts     = AdminView._readBulkDiscounts('edit-' + id);
    /* קטגוריה */
    var catSel = document.getElementById('pf-cat-edit');
    if (catSel) {
      var newCatVal = catSel.value;
      if (newCatVal === '__new__') {
        var newCatInp = document.getElementById('pf-cat-new-edit');
        var newCatName = newCatInp ? newCatInp.value.trim() : '';
        if (!newCatName) { App.toast('נא להזין שם קטגוריה חדשה', 'warning'); return; }
        newCatVal = newCatName.replace(/\s+/g, '_').toLowerCase();
        p.category = newCatVal;
        p.categoryLabel = newCatName;
      } else {
        /* שמור את ה-label מהאופציה הנבחרת */
        var selOpt = catSel.options[catSel.selectedIndex];
        p.category = newCatVal;
        p.categoryLabel = selOpt ? selOpt.text : newCatVal;
      }
    }
    /* שמירה ב-Firestore */
    if (window.DB) {
      window.DB.collection('products').doc(p.id).set(p)
        .catch(function (e) { console.warn('Firestore save error:', e); });
    }
    App.Store.set('products', PRODUCTS);
    App.closeModal();
    App.toast('המוצר עודכן', 'success');
    App.checkLowStock(p);
    AdminView._products(document.getElementById('av-content'));
  },

  _delProd: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    if (!confirm('למחוק את המוצר "' + p.name + '"? לא ניתן לשחזר.')) return;
    window.PRODUCTS = PRODUCTS.filter(function (x) { return x.id !== id; });
    App.Store.set('products', window.PRODUCTS);
    if (window.DB) {
      window.DB.collection('products').doc(id).delete()
        .catch(function (e) { console.warn('Firestore delete error:', e); });
    }
    App.toast('המוצר נמחק', 'success');
    AdminView._products(document.getElementById('av-content'));
  },

  _saveNewProd: function () {
    var sku  = document.getElementById('pf-sku').value.trim();
    var name = document.getElementById('pf-name').value.trim();
    var catSel = document.getElementById('pf-cat');
    var cat  = catSel ? catSel.value : 'cups';
    if (!sku || !name) { App.toast('מק"ט ושם חובה', 'warning'); return; }

    var catLabel, catIcon;
    if (cat === '__new__') {
      var newCatInp = document.getElementById('pf-cat-new');
      var newCatName = newCatInp ? newCatInp.value.trim() : '';
      if (!newCatName) { App.toast('נא להזין שם קטגוריה חדשה', 'warning'); return; }
      cat = newCatName.replace(/\s+/g, '_').toLowerCase();
      catLabel = newCatName;
      catIcon = '📦';
    } else {
      var catLabels = { cups:'כוסות', plates:'צלחות', napkins:'מפיות' };
      var catIcons  = { cups:'☕', plates:'🍽️', napkins:'🗒️' };
      /* חפש label מהמוצרים הקיימים */
      var existingProd = PRODUCTS.find(function (p) { return p.category === cat; });
      catLabel = (catLabels[cat]) || (existingProd ? existingProd.categoryLabel : cat);
      catIcon  = (catIcons[cat])  || (existingProd ? existingProd.icon : '📦');
    }

    var newProd = {
      id:             'prod-' + sku,
      sku:            sku,
      name:           name,
      category:       cat,
      categoryLabel:  catLabel,
      price:          parseFloat(document.getElementById('pf-price').value) || 0,
      stock:          parseInt(document.getElementById('pf-stock').value) || 100,
      description:    document.getElementById('pf-desc').value || '',
      icon:           catIcon,
      bgColor:        '#1a2030',
      image:          null,
      unitsPerPackage:   parseInt(document.getElementById('pf-upkg').value) || null,
      soldBy:            document.getElementById('pf-soldby').value || null,
      unitsPerContainer: parseInt(document.getElementById('pf-ucont').value) || null,
      bulkDiscounts:     AdminView._readBulkDiscounts('new-prod')
    };
    PRODUCTS.push(newProd);
    App.Store.set('products', PRODUCTS);
    if (window.DB) {
      window.DB.collection('products').doc(newProd.id).set(newProd)
        .catch(function (e) { console.warn('Firestore save error:', e); });
    }
    App.closeModal();
    App.toast('המוצר נוסף', 'success');
    AdminView._products(document.getElementById('av-content'));
  },

  /* ===== IMPORT PRODUCTS ===== */
  _showImport: function () {
    var template = JSON.stringify([
      { sku: '1010', name: 'שם המוצר', category: 'cups', price: 99, stock: 100, unitsPerPackage: 100, soldBy: 'קרטון', unitsPerContainer: 1000, description: 'תיאור קצר', image: '' }
    ], null, 2);
    App.showModal(
      '<h3><span class="material-icons-round">upload_file</span> ייבוא מוצרים מרשימה</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">' +
        'הדבק כאן רשימת מוצרים בפורמט JSON. שדות חובה: <strong>sku, name, category, price, stock</strong><br>' +
        'ערכים ל-category: <code>cups / plates / napkins</code>' +
      '</p>' +
      '<textarea id="import-json" rows="10" style="width:100%;background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px;font-size:12px;font-family:monospace;direction:ltr;resize:vertical">' +
        template +
      '</textarea>' +
      '<div style="display:flex;gap:10px;margin-top:12px">' +
        '<button class="btn-primary" onclick="AdminView._runImport()">' +
          '<span class="material-icons-round">cloud_upload</span> ייבא מוצרים</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
      '</div>'
    );
  },

  _runImport: function () {
    var raw = document.getElementById('import-json').value.trim();
    var list;
    try { list = JSON.parse(raw); if (!Array.isArray(list)) throw new Error('not array'); }
    catch (e) { App.toast('שגיאה בפורמט ה-JSON', 'error'); return; }
    var catLabels = { cups: 'כוסות', plates: 'צלחות', napkins: 'מפיות' };
    var catIcons  = { cups: '☕', plates: '🍽️', napkins: '🗒️' };
    var catColors = { cups: '#2d1e14', plates: '#142d1e', napkins: '#1e142d' };
    var errors = []; var batch = window.DB ? window.DB.batch() : null;
    list.forEach(function (item, i) {
      if (!item.sku || !item.name || !item.category || item.price === undefined) {
        errors.push('שורה ' + (i + 1) + ': חסרים שדות חובה'); return;
      }
      var prod = {
        id:             'prod-' + item.sku,
        sku:            String(item.sku),
        name:           item.name,
        category:       item.category,
        categoryLabel:  catLabels[item.category] || item.category,
        price:          parseFloat(item.price) || 0,
        stock:          parseInt(item.stock) || 0,
        description:    item.description || '',
        icon:           catIcons[item.category] || '📦',
        bgColor:        catColors[item.category] || '#1a2030',
        image:          item.image || null,
        unitsPerPackage:   parseInt(item.unitsPerPackage) || null,
        soldBy:            item.soldBy || null,
        unitsPerContainer: parseInt(item.unitsPerContainer) || null,
        bulkDiscounts:     item.bulkDiscounts || []
      };
      var existing = PRODUCTS.findIndex(function (p) { return p.id === prod.id; });
      if (existing > -1) PRODUCTS[existing] = prod; else PRODUCTS.push(prod);
      if (batch) { var ref = window.DB.collection('products').doc(prod.id); batch.set(ref, prod); }
    });
    if (errors.length) { App.toast(errors[0], 'error'); return; }
    App.Store.set('products', PRODUCTS);
    function finish() {
      App.closeModal();
      App.toast('יובאו ' + list.length + ' מוצרים', 'success');
      AdminView._products(document.getElementById('av-content'));
    }
    if (batch) batch.commit().then(finish).catch(function () { finish(); });
    else finish();
  },

  /* ===== QUOTE REQUESTS ===== */
  _quoteRequests: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';
    if (!window.DB) {
      c.innerHTML = '<div class="admin-section"><p style="color:var(--text-muted);padding:24px">Firestore לא מחובר</p></div>';
      return;
    }
    window.DB.collection('quote_requests').orderBy('requestedAt', 'desc').get()
      .then(function (snap) {
        var requests = [];
        snap.forEach(function (d) { requests.push(Object.assign({ _id: d.id }, d.data())); });
        var pendingCount = requests.filter(function (r) { return r.status === 'pending'; }).length;
        var rows = requests.length ? requests.map(function (r) {
          var d = new Date(r.requestedAt).toLocaleDateString('he-IL');
          var statusBadge = r.status === 'approved'
            ? '<span style="background:var(--green-dim);color:var(--green);border-radius:12px;padding:2px 10px;font-size:12px">אושר</span>'
            : '<span style="background:var(--orange-dim);color:var(--orange);border-radius:12px;padding:2px 10px;font-size:12px">ממתין</span>';
          return '<tr>' +
            '<td>' + d + '</td>' +
            '<td><strong>' + App.escHTML(r.customerName) + '</strong><div style="font-size:11px;color:var(--text-muted)">' + App.escHTML(r.customerPhone || '') + '</div></td>' +
            '<td>' + App.escHTML(r.productName) + '<div style="font-size:11px;color:var(--text-muted)">מק"ט ' + App.escHTML(r.productSku || '') + '</div></td>' +
            '<td>' + statusBadge + '</td>' +
            '<td>' + (r.approvedPrice ? '₪' + r.approvedPrice : '—') + '</td>' +
            '<td style="padding:8px">' +
              (r.status === 'pending'
                ? '<button class="btn-sm" onclick="AdminView._approveQuote(\'' + r._id + '\',\'' + r.customerId + '\',\'' + r.productId + '\')" title="אשר מחיר" style="background:var(--green-dim);color:var(--green)">' +
                    '<span class="material-icons-round">price_check</span></button>'
                : '') +
            '</td></tr>';
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">אין בקשות עדיין</td></tr>';

        c.innerHTML = '<div class="admin-section">' +
          '<div class="admin-section-header"><h2>בקשות להצעות מחיר' +
            (pendingCount > 0 ? ' <span style="background:var(--orange);color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;margin-right:6px">' + pendingCount + ' ממתינות</span>' : '') +
          '</h2><span style="font-size:13px;color:var(--text-muted)">' + requests.length + ' סה"כ</span></div>' +
          '<div class="table-wrap"><table class="admin-table">' +
            '<thead><tr><th>תאריך</th><th>לקוח</th><th>מוצר</th><th>סטטוס</th><th>מחיר שאושר</th><th>פעולה</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div></div>';
      })
      .catch(function () {
        c.innerHTML = '<div class="admin-section"><p style="color:var(--red);padding:24px">שגיאה בטעינת הבקשות</p></div>';
      });
  },

  _approveQuote: function (requestId, customerId, productId) {
    App.showModal(
      '<h3><span class="material-icons-round">price_check</span> אשר הצעת מחיר</h3>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>מחיר אישי ללקוח (₪, לפני מע"מ)</label>' +
          '<input type="number" id="aq-price" placeholder="הזן מחיר" min="0" step="0.01" style="font-size:20px;font-weight:700"></div>' +
        '<div style="display:flex;gap:10px;margin-top:8px">' +
          '<button class="btn-primary" onclick="AdminView._confirmApproveQuote(\'' + requestId + '\',\'' + customerId + '\',\'' + productId + '\')">' +
            '<span class="material-icons-round">check</span> אשר ועדכן מחיר</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
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
    if (isNaN(price) || price <= 0) { App.toast('נא להזין מחיר תקין', 'warning'); return; }

    /* עדכון מחיר אישי ללקוח */
    var cu = CUSTOMERS_DB.find(function (x) { return x.id === customerId; });
    if (cu) {
      if (!cu.personalPrices) cu.personalPrices = {};
      cu.personalPrices[productId] = price;
      DBSync.saveCustomer(cu);
    }

    /* עדכון Firestore - quote_requests */
    if (window.DB) {
      window.DB.collection('quote_requests').doc(requestId).update({
        status: 'approved',
        approvedPrice: price,
        approvedAt: new Date().toISOString()
      }).catch(function (e) { console.warn('quote update error:', e); });
    }

    App.closeModal();
    App.toast('המחיר אושר ועודכן ללקוח ✅', 'success');
    AdminView._quoteRequests(document.getElementById('av-content'));
  },

  /* ===== PRODUCT REQUESTS ===== */
  _productRequests: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';
    if (!window.DB) {
      c.innerHTML = '<div class="admin-section"><p style="color:var(--text-muted);padding:24px">Firestore לא מחובר</p></div>';
      return;
    }
    window.DB.collection('product_requests').orderBy('requestedAt', 'desc').get()
      .then(function (snap) {
        var requests = [];
        snap.forEach(function (d) { requests.push(Object.assign({ _id: d.id }, d.data())); });
        var pendingCount = requests.filter(function (r) { return r.status === 'pending'; }).length;
        var rows = requests.length ? requests.map(function (r) {
          var d = new Date(r.requestedAt).toLocaleDateString('he-IL');
          var statusBadge = r.status === 'handled'
            ? '<span style="background:var(--green-dim);color:var(--green);border-radius:12px;padding:2px 10px;font-size:12px">טופל</span>'
            : '<span style="background:var(--orange-dim);color:var(--orange);border-radius:12px;padding:2px 10px;font-size:12px">ממתין</span>';
          return '<tr>' +
            '<td>' + d + '</td>' +
            '<td><strong>' + App.escHTML(r.customerName) + '</strong><div style="font-size:11px;color:var(--text-muted)">' + App.escHTML(r.customerPhone || '') + '</div></td>' +
            '<td><strong>' + App.escHTML(r.productName) + '</strong>' + (r.estimatedQty ? '<div style="font-size:11px;color:var(--text-muted)">כמות משוערת: ' + r.estimatedQty + '</div>' : '') + '</td>' +
            '<td>' + App.escHTML(r.notes || '—') + '</td>' +
            '<td>' + statusBadge + '</td>' +
            '<td style="padding:8px">' +
              (r.status === 'pending'
                ? '<button class="btn-sm" onclick="AdminView._markProductRequestHandled(\'' + r._id + '\')" title="סמן כטופל" style="background:var(--green-dim);color:var(--green)">' +
                    '<span class="material-icons-round">check_circle</span></button>'
                : '') +
            '</td></tr>';
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">אין בקשות עדיין</td></tr>';

        c.innerHTML = '<div class="admin-section">' +
          '<div class="admin-section-header"><h2>בקשות למוצרים חדשים' +
            (pendingCount > 0 ? ' <span style="background:var(--orange);color:#fff;border-radius:12px;padding:2px 10px;font-size:12px;margin-right:6px">' + pendingCount + ' חדשות</span>' : '') +
          '</h2><span style="font-size:13px;color:var(--text-muted)">' + requests.length + ' סה"כ</span></div>' +
          '<div class="table-wrap"><table class="admin-table">' +
            '<thead><tr><th>תאריך</th><th>לקוח</th><th>מוצר מבוקש</th><th>הערות</th><th>סטטוס</th><th>פעולה</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div></div>';
      })
      .catch(function () {
        c.innerHTML = '<div class="admin-section"><p style="color:var(--red);padding:24px">שגיאה בטעינת הבקשות</p></div>';
      });
  },

  _markProductRequestHandled: function (requestId) {
    if (!window.DB) return;
    window.DB.collection('product_requests').doc(requestId).update({ status: 'handled' })
      .then(function () {
        App.toast('סומן כטופל', 'success');
        AdminView._productRequests(document.getElementById('av-content'));
      })
      .catch(function () { App.toast('שגיאה', 'error'); });
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

    c.innerHTML =
      '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>סטטיסטיקות</h2>' +
          '<span style="font-size:13px;color:var(--text-muted)">' + now.toLocaleDateString('he-IL', {month:'long', year:'numeric'}) + '</span>' +
        '</div>' +
        '<h3 style="font-size:14px;color:var(--text-muted);margin-bottom:10px">החודש הנוכחי</h3>' +
        '<div class="stats-grid">' +
          statCard('payments', 'הכנסות החודש', '₪' + App.fmtP(mRevenue), mOrders + ' הזמנות') +
          statCard('star', 'מוצר מוביל', mTopProd ? mTopProd.name : '—', mTopProd ? mTopProd.qty + ' יח׳' : '') +
          statCard('emoji_events', 'לקוח מוביל', mTopCust ? mTopCust.name : '—', mTopCust ? '₪' + App.fmtP(mTopCust.total) : '') +
        '</div>' +
        '<h3 style="font-size:14px;color:var(--text-muted);margin:20px 0 10px">כל הזמנים</h3>' +
        '<div class="stats-grid">' +
          statCard('account_balance', 'סה"כ הכנסות', '₪' + App.fmtP(allRevenue), allTime.length + ' הזמנות') +
          statCard('inventory_2', 'מוצר מוביל', allTopProd ? allTopProd.name : '—', allTopProd ? allTopProd.qty + ' יח׳' : '') +
          statCard('workspace_premium', 'לקוח מוביל', allTopCust ? allTopCust.name : '—', allTopCust ? '₪' + App.fmtP(allTopCust.total) : '') +
        '</div>' +
      '</div>';
  },

  /* ===== FINANCIAL ===== */
  _financial: function (c) {
    var expenses = App.Store.get('expenses') || [];
    var orders   = App.Orders.getAll();
    var income   = orders.reduce(function (s, o) { return s + o.total; }, 0);
    var totalExp = expenses.reduce(function (s, e) { return s + (e.type === 'expense' ? e.amount : -e.amount); }, 0);
    var profit   = parseFloat((income - totalExp).toFixed(2));

    var rows = expenses.length
      ? expenses.map(function (e, i) {
          return '<tr>' +
            '<td>' + e.date + '</td>' +
            '<td>' + e.description + '</td>' +
            '<td>' + (e.category || '—') + '</td>' +
            '<td style="color:' + (e.type === 'expense' ? 'var(--red)' : 'var(--green)') + ';font-weight:700">' +
              (e.type === 'expense' ? '−' : '+') + '₪' + App.fmtP(e.amount) + '</td>' +
            '<td><button class="btn-sm danger" onclick="AdminView._delExpense(\'' + App.escHTML(e.date + '|' + e.description + '|' + e.amount) + '\')"><span class="material-icons-round">delete</span></button></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">אין רשומות עדיין</td></tr>';

    c.innerHTML =
      '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>ניהול פיננסי</h2>' +
          '<button class="btn-primary" onclick="AdminView._addExpense()"><span class="material-icons-round">add</span> הוסף רשומה</button>' +
        '</div>' +
        '<div class="stats-grid" style="margin-bottom:20px">' +
          '<div class="stat-card"><span class="material-icons-round">trending_up</span><div><div class="stat-val" style="color:var(--green)">₪' + App.fmtP(income) + '</div><div class="stat-label">הכנסות (הזמנות)</div></div></div>' +
          '<div class="stat-card"><span class="material-icons-round">trending_down</span><div><div class="stat-val" style="color:var(--red)">₪' + App.fmtP(totalExp) + '</div><div class="stat-label">הוצאות</div></div></div>' +
          '<div class="stat-card"><span class="material-icons-round">account_balance</span><div><div class="stat-val" style="color:' + (profit >= 0 ? 'var(--green)' : 'var(--red)') + '">₪' + App.fmtP(Math.abs(profit)) + '</div><div class="stat-label">' + (profit >= 0 ? 'רווח' : 'הפסד') + '</div></div></div>' +
        '</div>' +
        '<div class="table-wrap"><table class="admin-table">' +
          '<thead><tr><th>תאריך</th><th>תיאור</th><th>קטגוריה</th><th>סכום</th><th>מחק</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div>' +
      '</div>';
  },

  _addExpense: function () {
    App.showModal(
      '<h3>הוסף רשומה פיננסית</h3>' +
      '<div class="customer-form">' +
        AdminView._fld('תאריך', 'fin-date', new Date().toISOString().split('T')[0], 'date') +
        AdminView._fld('תיאור', 'fin-desc', '') +
        AdminView._fld('קטגוריה (רשות)', 'fin-cat', '') +
        AdminView._fld('סכום (₪)', 'fin-amount', '', 'number') +
        '<div class="form-group"><label>סוג</label>' +
          '<select id="fin-type" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px">' +
            '<option value="expense">הוצאה</option><option value="income">הכנסה נוספת</option>' +
          '</select></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminView._saveExpense()"><span class="material-icons-round">save</span> שמור</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveExpense: function () {
    var amount = parseFloat(document.getElementById('fin-amount').value);
    var desc   = document.getElementById('fin-desc').value.trim();
    if (!amount || !desc) { App.toast('תיאור וסכום חובה', 'warning'); return; }
    var record = {
      date:        document.getElementById('fin-date').value,
      description: desc,
      category:    document.getElementById('fin-cat').value,
      amount:      amount,
      type:        document.getElementById('fin-type').value
    };
    var exp = App.Store.get('expenses') || [];
    exp.unshift(record);
    App.Store.set('expenses', exp);
    App.closeModal();
    App.toast('הרשומה נשמרה', 'success');
    AdminView._financial(document.getElementById('av-content'));
  },

  _delExpense: function (key) {
    if (!confirm('למחוק רשומה זו?')) return;
    var exp = App.Store.get('expenses') || [];
    var idx = exp.findIndex(function (e) { return (e.date + '|' + e.description + '|' + e.amount) === key; });
    if (idx === -1) { App.toast('רשומה לא נמצאה', 'error'); return; }
    exp.splice(idx, 1);
    App.Store.set('expenses', exp);
    App.toast('נמחק', 'success');
    AdminView._financial(document.getElementById('av-content'));
  },

  /* ===== SETTINGS ===== */
  _settings: function (c) {
    var s = App.state.settings;
    c.innerHTML =
      '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>הגדרות מערכת</h2></div>' +
        '<div class="settings-grid">' +
          AdminView._fld('מינימום הזמנה למשלוח חינם (₪, לפני מע"מ)', 'sv-min', s.minOrderAmount, 'number') +
          AdminView._fld('דמי משלוח ברירת מחדל (₪)', 'sv-ship', s.defaultShippingCost, 'number') +
          '<div class="form-group full-width"><label>הודעת מערכת (מוצגת ללקוחות אחרי כניסה)</label>' +
            '<textarea id="sv-sysmsg" rows="3">' + (s.systemMessage || '') + '</textarea></div>' +
          '<div class="form-group full-width"><label>כותרת ראשית בדף נחיתה</label>' +
            '<input type="text" id="sv-title" value="' + s.landingTitle + '"></div>' +
          '<div class="form-group full-width"><label>תת-כותרת / תיאור בדף נחיתה</label>' +
            '<textarea id="sv-sub" rows="2">' + s.landingSubtitle + '</textarea></div>' +
          AdminView._fld('קוד מנהל (PIN)', 'sv-pin', s.adminPin, 'password') +
          AdminView._fld('WhatsApp מנהל לקבלת התראות (כולל קידומת 972)', 'sv-phone', s.adminPhone || '', 'tel') +
          AdminView._fld('מייל מנהל לקבלת התראות', 'sv-email', s.adminEmail || '', 'email') +
        '</div>' +
        '<button class="btn-primary" onclick="AdminView._saveSettings()">' +
          '<span class="material-icons-round">save</span> שמור הגדרות' +
        '</button>' +
      '</div>';
  },

  _saveSettings: function () {
    var s = App.state.settings;
    s.minOrderAmount       = parseInt(document.getElementById('sv-min').value)  || s.minOrderAmount;
    s.defaultShippingCost  = parseInt(document.getElementById('sv-ship').value) || s.defaultShippingCost;
    s.systemMessage        = document.getElementById('sv-sysmsg').value;
    s.landingTitle         = document.getElementById('sv-title').value;
    s.landingSubtitle      = document.getElementById('sv-sub').value;
    s.adminPhone           = document.getElementById('sv-phone').value;
    s.adminEmail           = document.getElementById('sv-email').value;
    var pin = document.getElementById('sv-pin').value;
    if (pin && pin.length >= 4) {
      s.adminPin = pin;
    } else if (pin && pin.length > 0 && pin.length < 4) {
      App.toast('קוד מנהל חייב להכיל לפחות 4 תווים', 'warning');
      return;
    }
    App.saveSettings();
    App.toast('ההגדרות נשמרו', 'success');
  }
};
