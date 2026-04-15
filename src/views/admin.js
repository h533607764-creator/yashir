var AdminView = {
  _tab: 'orders',

  render: function (el, params) {
    params = params || {};
    if (params.tab) AdminView._tab = params.tab;
    var tabs = [
      { id: 'orders',    label: 'הזמנות',  icon: 'list_alt' },
      { id: 'customers', label: 'לקוחות',  icon: 'people' },
      { id: 'products',  label: 'מוצרים',  icon: 'inventory_2' },
      { id: 'settings',  label: 'הגדרות',  icon: 'settings' }
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
  },

  tab: function (id) {
    AdminView._tab = id;
    document.querySelectorAll('.admin-tab').forEach(function (b) { b.classList.remove('active'); });
    var btn = document.querySelector('.admin-tab[onclick="AdminView.tab(\'' + id + '\')"]');
    if (btn) btn.classList.add('active');
    AdminView._render(id);
  },

  _render: function (id) {
    var c = document.getElementById('av-content');
    if (!c) return;
    ({ orders: AdminView._orders, customers: AdminView._customers, products: AdminView._products, settings: AdminView._settings })[id](c);
  },

  /* ===== ORDERS ===== */
  _orders: function (c) {
    var all = App.Orders.getAll();
    var rows = all.length
      ? all.map(function (o) {
          var d = new Date(o.timestamp).toLocaleDateString('he-IL');
          return '<tr>' +
            '<td><strong>' + o.id + '</strong></td>' +
            '<td>' + o.customerName + '</td>' +
            '<td>' + d + '</td>' +
            '<td style="color:var(--blue);font-weight:700">₪' + o.total + '</td>' +
            '<td><span class="status-badge ' + o.status + '">' + (o.status === 'pending' ? 'בטיפול' : 'הושלם') + '</span></td>' +
            '<td style="display:flex;gap:6px;padding:8px">' +
              '<button class="btn-sm" title="צפה" onclick="AdminView._viewOrder(' + o.id + ')"><span class="material-icons-round">visibility</span></button>' +
              '<button class="btn-sm" title="תעודה" onclick="SuccessView.printNote(' + o.id + ')"><span class="material-icons-round">print</span></button>' +
            '</td></tr>';
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">אין הזמנות עדיין</td></tr>';

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>הזמנות</h2>' +
        '<span style="font-size:13px;color:var(--text-muted)">' + all.length + ' הזמנות סה"כ</span>' +
      '</div>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>מספר</th><th>לקוח</th><th>תאריך</th><th>סה"כ</th><th>סטטוס</th><th>פעולות</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  },

  _viewOrder: function (orderId) {
    var o = (App.Orders.getAll()).find(function (x) { return x.id === orderId; });
    if (!o) { App.toast('הזמנה לא נמצאה', 'error'); return; }
    var rows = o.items.map(function (i) {
      return '<tr><td>' + i.product.sku + '</td><td>' + i.product.name + '</td><td>' + i.qty + '</td>' +
        '<td>' + i.discountPct + '%</td><td>₪' + (i.unitPrice * i.qty) + '</td></tr>';
    }).join('');
    App.showModal(
      '<h3>הזמנה #' + o.id + ' — ' + o.customerName + '</h3>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>מק"ט</th><th>מוצר</th><th>כמות</th><th>הנחה</th><th>סה"כ</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="order-totals">' +
        '<div>לפני מע"מ: ₪' + o.subtotal + '</div>' +
        '<div>מע"מ: ₪' + o.vat + '</div>' +
        '<div style="font-weight:700;font-size:16px">סה"כ: ₪' + o.total + '</div>' +
        (o.savings > 0 ? '<div style="color:var(--green)">חסכון: ₪' + o.savings + '</div>' : '') +
      '</div>' +
      (o.notes ? '<p style="margin-top:8px;font-size:14px;color:var(--text-muted)"><strong>הערות:</strong> ' + o.notes + '</p>' : '') +
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
      return '<tr>' +
        '<td><code style="font-size:12px">' + cu.id + '</code></td>' +
        '<td><strong>' + cu.name + '</strong></td>' +
        '<td>' + cu.phone + '</td>' +
        '<td>' + (cu.generalDiscount || 0) + '%</td>' +
        '<td>₪' + (cu.shippingCost || App.state.settings.defaultShippingCost) + '</td>' +
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
        '<thead><tr><th>ח.פ</th><th>שם</th><th>טלפון</th><th>הנחה כללית</th><th>דמי משלוח</th><th>מחירים אישיים</th><th>פעולות</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
  },

  _fld: function (label, id, value, type, disabled) {
    return '<div class="form-group"><label>' + label + '</label>' +
      '<input type="' + (type || 'text') + '" id="' + id + '" value="' + (value || '') + '"' + (disabled ? ' disabled style="opacity:.5"' : '') + '></div>';
  },

  _editCust: function (id) {
    var isNew = !id;
    var cu = isNew ? { id:'', name:'', email:'', phone:'', address:'', contactPerson:'', shippingAddress:'', generalDiscount:0, shippingCost:45, personalPrices:{} }
                   : CUSTOMERS_DB.find(function (x) { return x.id === id; }) || {};
    App.showModal(
      '<h3>' + (isNew ? 'הוסף לקוח חדש' : 'עריכת ' + cu.name) + '</h3>' +
      '<div class="customer-form">' +
        AdminView._fld('ח.פ / עוסק מורשה', 'ef-id', cu.id, 'text', !isNew) +
        AdminView._fld('שם עסק', 'ef-name', cu.name, 'text') +
        AdminView._fld('טלפון', 'ef-phone', cu.phone, 'tel') +
        AdminView._fld('מייל', 'ef-email', cu.email, 'email') +
        AdminView._fld('כתובת', 'ef-address', cu.address, 'text') +
        AdminView._fld('איש קשר למשלוח', 'ef-contact', cu.contactPerson, 'text') +
        AdminView._fld('כתובת למשלוח', 'ef-shaddr', cu.shippingAddress, 'text') +
        AdminView._fld('הנחה כללית (%)', 'ef-disc', cu.generalDiscount, 'number') +
        AdminView._fld('דמי משלוח אישיים (₪)', 'ef-ship', cu.shippingCost, 'number') +
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
    var existing = origId ? CUSTOMERS_DB.find(function (x) { return x.id === origId; }) : null;
    var data = {
      id: id, name: name,
      phone:           document.getElementById('ef-phone').value,
      email:           document.getElementById('ef-email').value,
      address:         document.getElementById('ef-address').value,
      contactPerson:   document.getElementById('ef-contact').value,
      shippingAddress: document.getElementById('ef-shaddr').value,
      generalDiscount: parseInt(document.getElementById('ef-disc').value) || 0,
      shippingCost:    parseInt(document.getElementById('ef-ship').value) || 45,
      personalPrices:  existing ? (existing.personalPrices || {}) : {}
    };
    if (origId) {
      var idx = CUSTOMERS_DB.findIndex(function (x) { return x.id === origId; });
      if (idx > -1) CUSTOMERS_DB[idx] = data; else CUSTOMERS_DB.push(data);
    } else {
      CUSTOMERS_DB.push(data);
    }
    App.Store.set('customers', CUSTOMERS_DB);
    App.closeModal();
    App.toast('הלקוח נשמר', 'success');
    AdminView._customers(document.getElementById('av-content'));
  },

  _delCust: function (id) {
    if (!confirm('למחוק לקוח ' + id + '?')) return;
    window.CUSTOMERS_DB = CUSTOMERS_DB.filter(function (x) { return x.id !== id; });
    App.Store.set('customers', CUSTOMERS_DB);
    App.toast('הלקוח נמחק', 'success');
    AdminView._customers(document.getElementById('av-content'));
  },

  _custPrices: function (custId) {
    var cu = CUSTOMERS_DB.find(function (x) { return x.id === custId; });
    if (!cu) return;
    var rows = PRODUCTS.map(function (p) {
      var curr = cu.personalPrices && cu.personalPrices[p.id] !== undefined ? cu.personalPrices[p.id] : '';
      return '<div class="personal-price-row">' +
        '<span class="sku">' + p.sku + '</span>' +
        '<span>' + p.name + '</span>' +
        '<span class="base-price-hint">מחיר כללי: ₪' + p.price + '</span>' +
        '<input type="number" id="pp-' + p.id + '" value="' + curr + '" placeholder="—" min="0" style="width:80px">' +
      '</div>';
    }).join('');
    App.showModal(
      '<h3>מחירים אישיים — ' + cu.name + '</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">השאר ריק להשתמש במחיר כללי / הנחה כללית</p>' +
      '<div class="personal-prices-grid">' + rows + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button class="btn-primary" onclick="AdminView._savePrices(\'' + custId + '\')">' +
          '<span class="material-icons-round">save</span> שמור מחירים</button>' +
        '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
      '</div>'
    );
  },

  _savePrices: function (custId) {
    var cu = CUSTOMERS_DB.find(function (x) { return x.id === custId; });
    if (!cu) return;
    cu.personalPrices = {};
    PRODUCTS.forEach(function (p) {
      var inp = document.getElementById('pp-' + p.id);
      if (inp && inp.value !== '') cu.personalPrices[p.id] = parseFloat(inp.value);
    });
    App.Store.set('customers', CUSTOMERS_DB);
    App.closeModal();
    App.toast('המחירים האישיים נשמרו', 'success');
  },

  /* ===== PRODUCTS ===== */
  _products: function (c) {
    var rows = PRODUCTS.map(function (p) {
      var thumb = p.image
        ? '<img src="' + CloudinaryUpload.buildThumbUrl(p.image) + '" alt="' + p.name + '" loading="lazy" style="width:60px;height:44px;object-fit:cover;border-radius:6px;display:block">'
        : '<span style="font-size:26px;display:block;text-align:center">' + p.icon + '</span>';
      return '<tr>' +
        '<td><code>' + p.sku + '</code></td>' +
        '<td style="display:flex;align-items:center;gap:10px;padding:8px 14px">' + thumb + '<span>' + p.name + '</span></td>' +
        '<td>' + p.categoryLabel + '</td>' +
        '<td style="color:var(--blue);font-weight:700">₪' + p.price + '</td>' +
        '<td>' + (p.stock > 0 ? p.stock : '<span style="color:var(--red)">0 — חסר</span>') + '</td>' +
        '<td style="display:flex;gap:6px;padding:8px">' +
          '<button class="btn-sm" onclick="AdminView._editProd(\'' + p.id + '\')" title="ערוך">' +
            '<span class="material-icons-round">edit</span></button>' +
          '<button class="btn-sm" onclick="AdminView._quickUpload(\'' + p.id + '\')" title="העלה תמונה" style="background:var(--orange-dim);color:var(--orange)">' +
            '<span class="material-icons-round">add_photo_alternate</span></button>' +
        '</td></tr>';
    }).join('');

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>מוצרים</h2>' +
        '<button class="btn-primary" onclick="AdminView._addProd()">' +
          '<span class="material-icons-round">add</span> הוסף מוצר</button>' +
      '</div>' +
      '<p class="admin-note">תאריך עדכון אחרון: ' + new Date().toLocaleDateString('he-IL') + ' | Cloud: dmqjap7r1</p>' +
      '<input type="file" id="quick-upload-input" accept="image/*" style="display:none" onchange="AdminView._handleQuickUpload(this)">' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>מק"ט</th><th>שם</th><th>קטגוריה</th><th>מחיר</th><th>מלאי</th><th>פעולות</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
  },

  /* ===== QUICK UPLOAD (from product row button) ===== */
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
    AdminView._doUpload(file, productId, function (url) {
      App.toast('✓ התמונה הועלתה בהצלחה', 'success');
      AdminView._products(document.getElementById('av-content'));
    });
  },

  /* ===== CORE UPLOAD LOGIC ===== */
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

  _editProd: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var previewUrl = p.image ? CloudinaryUpload.buildCatalogUrl(p.image) : null;

    App.showModal(
      '<h3>עריכת מוצר — ' + p.icon + ' ' + p.name + '</h3>' +
      '<div class="customer-form">' +
        AdminView._fld('שם מוצר', 'pf-name', p.name) +
        AdminView._fld('מחיר כללי (₪)', 'pf-price', p.price, 'number') +
        AdminView._fld('מלאי', 'pf-stock', p.stock, 'number') +
        AdminView._fld('יחידה (לדוגמה: ל-100 יח׳)', 'pf-unit', p.unit) +
        AdminView._fld('תיאור', 'pf-desc', p.description) +

        /* ===== IMAGE UPLOAD SECTION ===== */
        '<div class="form-group" style="gap:10px">' +
          '<label>תמונת מוצר</label>' +

          /* Current image preview */
          '<div id="img-preview-wrap" style="margin-bottom:8px">' +
            (previewUrl
              ? '<img id="img-preview-' + id + '" src="' + previewUrl + '" alt="תצוגה מקדימה" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1.5px solid var(--border)">'
              : '<div id="img-preview-' + id + '" style="display:none"></div>' +
                '<div style="padding:20px;text-align:center;background:var(--navy-dark);border-radius:10px;border:1.5px dashed var(--border);color:var(--text-muted);font-size:14px">' +
                '<span class="material-icons-round" style="font-size:32px;display:block;margin-bottom:6px">image</span>אין תמונה עדיין</div>') +
          '</div>' +

          /* Upload button */
          '<label class="upload-btn-label" style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--blue-dim);border:1.5px solid var(--border-blue);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;font-weight:700;color:var(--blue);transition:background .2s">' +
            '<span class="material-icons-round">add_photo_alternate</span> בחר תמונה מהמחשב' +
            '<input type="file" accept="image/*" style="display:none" onchange="AdminView._handleEditUpload(\'' + id + '\',this)">' +
          '</label>' +

          /* Progress bar */
          '<div id="upload-progress-' + id + '" style="display:none;margin-top:6px">' +
            '<div style="background:var(--navy-dark);border-radius:4px;overflow:hidden;height:8px">' +
              '<div class="upload-bar-fill" style="height:100%;background:var(--blue);width:0%;transition:width .3s"></div>' +
            '</div>' +
            '<span class="upload-bar-label" style="font-size:12px;color:var(--text-muted)">0%</span>' +
          '</div>' +

          '<p style="font-size:12px;color:var(--text-muted);margin-top:4px">JPG/PNG/WEBP עד 10MB | הופך אוטומטית לפורמט מהיר לאינטרנט</p>' +
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

  _addProd: function () {
    App.showModal(
      '<h3>הוסף מוצר חדש</h3>' +
      '<div class="customer-form">' +
        AdminView._fld('מק"ט (מספר)', 'pf-sku', '', 'text') +
        AdminView._fld('שם מוצר', 'pf-name', '') +
        AdminView._fld('מחיר (₪)', 'pf-price', '', 'number') +
        AdminView._fld('מלאי', 'pf-stock', '100', 'number') +
        AdminView._fld('יחידה', 'pf-unit', "ל-100 יח׳") +
        AdminView._fld('תיאור', 'pf-desc', '') +
        '<div class="form-group"><label>קטגוריה</label>' +
          '<select id="pf-cat" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px">' +
            '<option value="cups">כוסות</option><option value="plates">צלחות</option><option value="napkins">מפיות</option>' +
          '</select></div>' +
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
    p.name  = document.getElementById('pf-name').value || p.name;
    p.price = parseFloat(document.getElementById('pf-price').value) || p.price;
    p.stock = parseInt(document.getElementById('pf-stock').value);
    p.unit  = document.getElementById('pf-unit').value || p.unit;
    p.description = document.getElementById('pf-desc').value || p.description;
    p.image = document.getElementById('pf-image').value.trim() || null;
    App.Store.set('products', PRODUCTS);
    // שמירה ב-Firestore
    if (window.DB) {
      window.DB.collection('products').doc(id).set(p)
        .catch(function (e) { console.warn('Firestore save error:', e); });
    }
    App.closeModal();
    App.toast('המוצר עודכן', 'success');
    AdminView._products(document.getElementById('av-content'));
  },

  _saveNewProd: function () {
    var sku  = document.getElementById('pf-sku').value.trim();
    var name = document.getElementById('pf-name').value.trim();
    var cat  = document.getElementById('pf-cat').value;
    if (!sku || !name) { App.toast('מק"ט ושם חובה', 'warning'); return; }
    var catLabels = { cups:'כוסות', plates:'צלחות', napkins:'מפיות' };
    var catIcons  = { cups:'☕', plates:'🍽️', napkins:'🗒️' };
    var newProd = {
      id: 'prod-' + sku,
      sku: sku,
      name: name,
      category: cat,
      categoryLabel: catLabels[cat],
      price: parseFloat(document.getElementById('pf-price').value) || 0,
      stock: parseInt(document.getElementById('pf-stock').value) || 100,
      unit: document.getElementById('pf-unit').value || "ל-100 יח׳",
      icon: catIcons[cat],
      bgColor: '#1a2030',
      description: document.getElementById('pf-desc').value || '',
      image: document.getElementById('pf-image').value.trim() || null
    };
    PRODUCTS.push(newProd);
    App.Store.set('products', PRODUCTS);
    // שמירה ב-Firestore
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
      { sku: '1010', name: 'שם המוצר', category: 'cups', price: 99, stock: 100, unit: "ל-100 יח'", description: 'תיאור קצר', image: '' }
    ], null, 2);
    App.showModal(
      '<h3><span class="material-icons-round">upload_file</span> ייבוא מוצרים מרשימה</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">' +
        'הדבק כאן רשימת מוצרים בפורמט JSON. כל מוצר חייב לכלול: <strong>sku, name, category, price, stock</strong><br>' +
        'ערכים אפשריים ל-category: <code>cups</code> / <code>plates</code> / <code>napkins</code>' +
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
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) throw new Error('not array');
    } catch (e) {
      App.toast('שגיאה בפורמט ה-JSON — בדוק את הרשימה', 'error');
      return;
    }
    var catLabels = { cups: 'כוסות', plates: 'צלחות', napkins: 'מפיות' };
    var catIcons  = { cups: '☕', plates: '🍽️', napkins: '🗒️' };
    var catColors = { cups: '#2d1e14', plates: '#142d1e', napkins: '#1e142d' };
    var errors = [];
    var batch  = window.DB ? window.DB.batch() : null;

    list.forEach(function (item, i) {
      if (!item.sku || !item.name || !item.category || item.price === undefined) {
        errors.push('שורה ' + (i + 1) + ': חסרים שדות חובה');
        return;
      }
      var prod = {
        id:            'prod-' + item.sku,
        sku:           String(item.sku),
        name:          item.name,
        category:      item.category,
        categoryLabel: catLabels[item.category] || item.category,
        price:         parseFloat(item.price) || 0,
        stock:         parseInt(item.stock) || 0,
        unit:          item.unit || "ל-100 יח'",
        description:   item.description || '',
        icon:          catIcons[item.category] || '📦',
        bgColor:       catColors[item.category] || '#1a2030',
        image:         item.image || null
      };
      var existing = PRODUCTS.findIndex(function (p) { return p.id === prod.id; });
      if (existing > -1) PRODUCTS[existing] = prod;
      else PRODUCTS.push(prod);
      if (batch) {
        var ref = window.DB.collection('products').doc(prod.id);
        batch.set(ref, prod);
      }
    });

    if (errors.length) {
      App.toast(errors[0], 'error');
      return;
    }

    App.Store.set('products', PRODUCTS);

    function finish() {
      App.closeModal();
      App.toast('יובאו ' + list.length + ' מוצרים בהצלחה', 'success');
      AdminView._products(document.getElementById('av-content'));
    }

    if (batch) {
      batch.commit().then(finish).catch(function () { finish(); });
    } else {
      finish();
    }
  },

  /* ===== SETTINGS ===== */
  _settings: function (c) {
    var s = App.state.settings;
    c.innerHTML =
      '<div class="admin-section">' +
        '<div class="admin-section-header"><h2>הגדרות מערכת</h2></div>' +
        '<div class="settings-grid">' +
          AdminView._fld('מינימום הזמנה למשלוח חינם (₪)', 'sv-min', s.minOrderAmount, 'number') +
          AdminView._fld('דמי משלוח ברירת מחדל (₪)', 'sv-ship', s.defaultShippingCost, 'number') +
          '<div class="form-group full-width"><label>הודעת מערכת (מוצגת ללקוחות אחרי כניסה)</label>' +
            '<textarea id="sv-sysmsg" rows="3">' + (s.systemMessage || '') + '</textarea></div>' +
          '<div class="form-group full-width"><label>כותרת ראשית בדף נחיתה</label>' +
            '<input type="text" id="sv-title" value="' + s.landingTitle + '"></div>' +
          '<div class="form-group full-width"><label>תת-כותרת / תיאור בדף נחיתה</label>' +
            '<textarea id="sv-sub" rows="2">' + s.landingSubtitle + '</textarea></div>' +
          AdminView._fld('קוד מנהל (PIN)', 'sv-pin', s.adminPin, 'password') +
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
    var pin = document.getElementById('sv-pin').value;
    if (pin && pin.length >= 4) s.adminPin = pin;
    App.saveSettings();
    App.toast('ההגדרות נשמרו', 'success');
  }
};
