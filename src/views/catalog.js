var CatalogView = {
  _cat: 'all',
  _q: '',
  _section: 'personal',

  render: function (el, params) {
    params = params || {};
    if (params.section) CatalogView._section = params.section;
    var isCust  = App.Auth.isCustomer();
    var isAdmin = App.Auth.isAdmin();

    el.innerHTML =
      '<div class="catalog-page">' +
        '<div class="catalog-toolbar">' +
          '<div class="container">' +
            '<div class="search-wrap">' +
              '<span class="material-icons-round">search</span>' +
              '<input type="text" id="cv-search" placeholder="חיפוש לפי שם מוצר או מק&quot;ט..." oninput="CatalogView.onSearch(this.value)" value="' + CatalogView._q + '">' +
            '</div>' +
            '<div class="cat-scroll">' +
              ['all','cups','plates','napkins'].map(function (c) {
                var labels = { all:'הכל', cups:'☕ כוסות', plates:'🍽️ צלחות', napkins:'🗒️ מפיות' };
                return '<button class="cat-btn' + (CatalogView._cat === c ? ' active' : '') + '" onclick="CatalogView.filterCat(\'' + c + '\',this)">' + labels[c] + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="container catalog-main">' +
          CatalogView._sectionLabel(isCust, isAdmin) +
          '<div class="product-grid" id="cv-grid"></div>' +
          (isCust && CatalogView._section === 'personal' ? '<div id="cv-full-link"></div>' : '') +
        '</div>' +
      '</div>';

    CatalogView._renderGrid();
    App.updateFloatBtns();
  },

  _sectionLabel: function (isCust, isAdmin) {
    if (!isCust && !isAdmin) return '';
    if (isAdmin) return '<div class="section-label full"><span class="material-icons-round">admin_panel_settings</span> תצוגת מנהל — כל המחירים</div>';
    if (CatalogView._section === 'personal') {
      return '<div class="section-label"><span class="material-icons-round">star</span> המוצרים שלך — מחירים אישיים</div>';
    }
    return '<div class="section-label full"><span class="material-icons-round">menu_book</span> קטלוג מלא' +
      '<button class="btn-back-personal" onclick="CatalogView.render(document.getElementById(\'view-content\'),{section:\'personal\'})">' +
        '<span class="material-icons-round">arrow_forward</span> חזרה למוצרים שלי' +
      '</button></div>';
  },

  _getProducts: function () {
    var cust = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    var list = PRODUCTS.slice().sort(function (a, b) { return (a.sku || '').localeCompare(b.sku || ''); });

    if (CatalogView._cat !== 'all') list = list.filter(function (p) { return p.category === CatalogView._cat; });
    if (CatalogView._q) {
      var q = CatalogView._q.toLowerCase();
      list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) > -1 || (p.sku || '').indexOf(q) > -1; });
    }

    if (cust && CatalogView._section === 'personal') {
      list = list.filter(function (p) { return App.Pricing.hasPersonal(p, cust); });
    }

    return list;
  },

  _renderGrid: function () {
    var grid = document.getElementById('cv-grid');
    if (!grid) return;
    var cust    = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    var isAdmin = App.Auth.isAdmin();
    var section = CatalogView._section;
    var list    = CatalogView._getProducts();

    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-grid"><span class="material-icons-round">inventory_2</span><p>לא נמצאו מוצרים</p></div>';
    } else {
      grid.innerHTML = list.map(function (p) { return CatalogView._card(p, cust, isAdmin, section); }).join('');
      if (!App._obs) {
        App._obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); App._obs.unobserve(e.target); } });
        }, { threshold: 0.05 });
      }
      grid.querySelectorAll('.product-card').forEach(function (c) { App._obs.observe(c); });
    }

    var fullLink = document.getElementById('cv-full-link');
    if (fullLink && App.Auth.isCustomer() && section === 'personal') {
      fullLink.innerHTML = '<div class="full-catalog-card" onclick="CatalogView.render(document.getElementById(\'view-content\'),{section:\'full\'})">' +
        '<span class="material-icons-round">expand_more</span><span>לקטלוג המלא</span><span class="material-icons-round">menu_book</span></div>';
    }
  },

  _card: function (product, cust, isAdmin, section) {
    var inStock  = product.stock > 0;
    var hasPersonal = cust && App.Pricing.hasPersonal(product, cust);
    /* בקטלוג מלא — מוצרים ללא מחיר אישי מוצגים ללא מחיר */
    var showPrice = isAdmin || hasPersonal || (cust && section !== 'full') || (cust && App.Pricing.getDiscountPct(product, cust) === 0 && cust.generalDiscount === 0 && !hasPersonal && section !== 'full');
    /* תמיד נציג מחיר בתצוגה האישית */
    if (cust && section === 'personal') showPrice = true;
    /* בקטלוג מלא, מוצר שיש לו מחיר כללי בלי הנחה אישית — מציגים מחיר */
    if (cust && section === 'full') showPrice = hasPersonal;

    var unitPrice = showPrice ? (isAdmin ? product.price : App.Pricing.getUnitPrice(product, cust)) : null;
    var discPct   = cust ? App.Pricing.getDiscountPct(product, cust) : 0;
    var showPersonalBadge = (section === 'full') && hasPersonal;

    /* מידע על המוצר */
    var productInfoHTML = '';
    if (product.unitsPerPackage) {
      productInfoHTML += '<span class="prod-info-tag"><span class="material-icons-round">inventory_2</span>' + product.unitsPerPackage + ' יח׳ בחבילה</span>';
    }
    if (product.soldBy) {
      productInfoHTML += '<span class="prod-info-tag"><span class="material-icons-round">local_shipping</span>נמכר ב' + product.soldBy + '</span>';
    }
    if (product.unitsPerContainer) {
      productInfoHTML += '<span class="prod-info-tag"><span class="material-icons-round">straighten</span>' + product.unitsPerContainer + ' יח׳ ב' + (product.soldBy || 'אריזה') + '</span>';
    }

    /* הנחות כמות */
    var bulkDiscHTML = '';
    if (product.bulkDiscounts && product.bulkDiscounts.length && showPrice) {
      var bulkItems = product.bulkDiscounts.map(function (d) {
        return '<span class="bulk-disc-item">מ-' + d.minQty + ' ' + (product.soldBy || 'יח׳') + ': <strong>-' + d.discountPct + '%</strong></span>';
      }).join('');
      bulkDiscHTML = '<div class="bulk-disc-banner"><span class="material-icons-round">local_offer</span><span>הנחת כמות: ' + bulkItems + '</span></div>';
    }

    var priceHTML = '';
    if (showPrice) {
      priceHTML = '<div class="card-price-row">' +
        '<span class="price-symbol">₪</span>' +
        '<span class="price-amount">' + App.fmtP(unitPrice) + '</span>' +
        (discPct > 0 ? '<span class="discount-badge">-' + discPct + '%</span>' : '') +
      '</div>';
    } else if (cust && section === 'full') {
      priceHTML = '<div class="card-price-row guest-quote">מחיר בהצעה אישית</div>';
    } else if (!cust && !isAdmin) {
      priceHTML = '<div class="card-price-row guest">התחבר לצפייה במחיר</div>';
    }

    var orderHTML = '';
    if (cust && section === 'full' && !hasPersonal) {
      /* מוצר ללא מחיר אישי בקטלוג מלא — כפתור הצעת מחיר */
      orderHTML = '<button class="btn-quote-request" onclick="CatalogView.requestQuote(\'' + product.id + '\')">' +
        '<span class="material-icons-round">request_quote</span> בקש הצעת מחיר' +
      '</button>';
    } else if (cust) {
      /* לקוח עם מחיר */
      var qtyId = 'qty-' + product.id;
      var addBtn = inStock
        ? '<button class="btn-add-cart" onclick="CatalogView._add(\'' + product.id + '\')">' +
            '<span class="material-icons-round">add_shopping_cart</span> הוסף' +
          '</button>'
        : '<button class="btn-add-cart oos" onclick="CatalogView._add(\'' + product.id + '\')">' +
            '<span class="material-icons-round">add_shopping_cart</span> הוסף' +
          '</button>';

      orderHTML =
        '<div class="card-order-row">' +
          '<div class="qty-wrap">' +
            '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',-1)">−</button>' +
            '<input class="qty-input" type="number" id="' + qtyId + '" value="1" min="1" max="999" oninput="CatalogView._updateLineTotal(\'' + product.id + '\')">' +
            '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',1)">+</button>' +
          '</div>' +
          addBtn +
        '</div>' +
        /* סה"כ שורה + הנחת כמות */
        '<div id="line-info-' + product.id + '" class="line-total-wrap"></div>' +
        (!inStock ? '<div class="oos-warning"><span class="material-icons-round">schedule</span> עלול להתעכב — חסר במלאי</div>' : '');
    } else if (!cust && !isAdmin) {
      orderHTML = '<button class="btn-login-to-order" onclick="App.navigate(\'login\')">' +
        '<span class="material-icons-round">lock</span> כניסה להזמנה</button>';
    }

    return '<article class="product-card' + (inStock ? '' : ' oos-card') + '">' +
      '<div class="card-img-wrap" style="background:' + product.bgColor + '">' +
        (product.image
          ? '<img src="' + CloudinaryUpload.buildCatalogUrl(product.image) + '" alt="' + product.name + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'
          : '<span class="card-icon">' + product.icon + '</span>') +
        '<span class="stock-badge ' + (inStock ? 'in' : 'out') + '">' + (inStock ? 'במלאי' : 'חסר') + '</span>' +
        (showPersonalBadge ? '<span class="personal-badge"><span class="material-icons-round">star</span> מחיר מיוחד בשבילך</span>' : '') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-meta"><span class="card-sku">מק"ט ' + product.sku + '</span><span class="card-cat">' + product.categoryLabel + '</span></div>' +
        '<h3 class="card-name">' + product.name + '</h3>' +
        '<p class="card-desc">' + product.description + '</p>' +
        (productInfoHTML ? '<div class="prod-info-tags">' + productInfoHTML + '</div>' : '') +
        bulkDiscHTML +
        priceHTML +
        orderHTML +
      '</div>' +
    '</article>';
  },

  /* עדכון סה"כ שורה + הצגת הנחת כמות בזמן אמת */
  _updateLineTotal: function (productId) {
    var infoEl  = document.getElementById('line-info-' + productId);
    if (!infoEl) return;
    var inp = document.getElementById('qty-' + productId);
    var qty = inp ? (parseInt(inp.value) || 1) : 1;
    var cust = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    if (!cust) { infoEl.innerHTML = ''; return; }

    var product = PRODUCTS.find(function (p) { return p.id === productId; });
    if (!product) { infoEl.innerHTML = ''; return; }

    var basePrice    = App.Pricing.getUnitPrice(product, cust);
    var bulkPct      = App.Pricing.getBulkDiscountPct(product, qty);
    var effectiveP   = App.Pricing.getEffectiveUnitPrice(product, cust, qty);

    if (basePrice === null) { infoEl.innerHTML = ''; return; }

    var html = '';
    if (qty > 1) {
      if (bulkPct > 0) {
        /* יש הנחת כמות */
        html = '<div class="line-total bulk-active">' +
          '<span class="line-orig">₪' + App.fmtP(basePrice * qty) + '</span>' +
          '<span class="line-disc-label">הנחת כמות -' + bulkPct + '%</span>' +
          '<span class="line-final">סה"כ ₪' + App.fmtP(effectiveP * qty) + '</span>' +
        '</div>';
      } else {
        html = '<div class="line-total">' +
          '<span class="line-final">סה"כ ₪' + App.fmtP(basePrice * qty) + '</span>' +
        '</div>';
        /* הצג סף הנחה הבאה */
        var next = App.Pricing.getNextBulkThreshold(product, qty);
        if (next) {
          html += '<div class="next-bulk-hint"><span class="material-icons-round">local_offer</span>עוד ' + (next.minQty - qty) + ' ' + (product.soldBy || 'יח׳') + ' לקבלת הנחת ' + next.discountPct + '%</div>';
        }
      }
    } else if (qty === 1) {
      /* הצג סף הנחה ראשוני */
      var nextDisc = App.Pricing.getNextBulkThreshold(product, qty);
      if (nextDisc) {
        html = '<div class="next-bulk-hint"><span class="material-icons-round">local_offer</span>הזמן ' + nextDisc.minQty + ' ' + (product.soldBy || 'יח׳') + ' לקבלת הנחת ' + nextDisc.discountPct + '%</div>';
      }
    }
    infoEl.innerHTML = html;
  },

  filterCat: function (cat, btn) {
    CatalogView._cat = cat;
    document.querySelectorAll('.cat-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    CatalogView._renderGrid();
  },
  onSearch: function (q) { CatalogView._q = q; CatalogView._renderGrid(); },
  _qty: function (id, d) {
    var inp = document.getElementById('qty-' + id);
    if (inp) {
      inp.value = Math.max(1, Math.min(999, parseInt(inp.value || 1) + d));
      CatalogView._updateLineTotal(id);
    }
  },
  _add: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var inp = document.getElementById('qty-' + id);
    var qty = inp ? parseInt(inp.value) || 1 : 1;
    App.Cart.add(p, qty);
    if (inp) { inp.value = 1; CatalogView._updateLineTotal(id); }
  },

  goFullCatalog: function () {
    CatalogView.render(document.getElementById('view-content'), { section: 'full' });
  },

  /* ===== בקשת הצעת מחיר ===== */
  requestQuote: function (productId) {
    var product = PRODUCTS.find(function (p) { return p.id === productId; });
    if (!product) return;
    var customer = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    if (!customer) { App.toast('יש להתחבר תחילה', 'warning'); return; }

    App.showModal(
      '<div class="sys-message">' +
        '<div class="sys-icon" style="background:var(--blue-dim);color:var(--blue)"><span class="material-icons-round" style="font-size:30px">request_quote</span></div>' +
        '<h3>בקשת הצעת מחיר</h3>' +
        '<p>האם לשלוח בקשת הצעת מחיר עבור:<br><strong>' + product.name + '</strong>?</p>' +
        '<p style="font-size:13px;color:var(--text-muted)">הנציג שלנו יחזור אליך עם מחיר אישי בהקדם.</p>' +
        '<div style="display:flex;gap:10px;margin-top:12px;width:100%">' +
          '<button class="btn-primary full-width" onclick="CatalogView._confirmQuote(\'' + productId + '\')">' +
            '<span class="material-icons-round">send</span> שלח בקשה' +
          '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
        '</div>' +
      '</div>'
    );
  },

  _confirmQuote: function (productId) {
    var product  = PRODUCTS.find(function (p) { return p.id === productId; });
    var customer = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    if (!product || !customer) return;

    var settings = App.state.settings;
    var reqData  = {
      customerId:   customer.id,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      productId:    product.id,
      productName:  product.name,
      productSku:   product.sku,
      requestedAt:  new Date().toISOString(),
      status:       'pending'
    };

    /* שמירה ב-Firestore */
    if (window.DB) {
      window.DB.collection('quote_requests').add(reqData)
        .catch(function (e) { console.warn('quote_request save error:', e); });
    }

    /* WhatsApp למנהל */
    if (settings.adminPhone) {
      var ph = settings.adminPhone.replace(/\D/g,'');
      if (ph.startsWith('0')) ph = '972' + ph.substring(1);
      var waMsg = '💰 *בקשת הצעת מחיר*\n' +
        '👤 לקוח: ' + customer.name + '\n' +
        '📱 ' + (customer.phone || '—') + '\n' +
        '📦 מוצר: ' + product.name + ' (מק"ט ' + product.sku + ')';
      setTimeout(function () {
        window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(waMsg), '_blank');
      }, 400);
    }

    /* מייל למנהל */
    if (settings.adminEmail) {
      var subject = 'בקשת הצעת מחיר — ' + customer.name + ' / ' + product.name;
      var body    = 'בקשת הצעת מחיר חדשה:\n\n' +
        'לקוח: ' + customer.name + ' (ח.פ: ' + customer.id + ')\n' +
        'טלפון: ' + (customer.phone || '—') + '\n' +
        'מייל: ' + (customer.email || '—') + '\n\n' +
        'מוצר: ' + product.name + '\n' +
        'מק"ט: ' + product.sku + '\n\n' +
        'ישיר שיווק והפצה';
      setTimeout(function () {
        window.open('mailto:' + settings.adminEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
      }, 1000);
    }

    App.closeModal();
    App.toast('הבקשה נשלחה! ניצור איתך קשר בהקדם', 'success');
  },

  /* ===== בקשת מוצר חדש ===== */
  requestNewProduct: function () {
    var customer = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    if (!customer) { App.navigate('login'); return; }

    App.showModal(
      '<h3><span class="material-icons-round">add_circle</span> בקשת מוצר חדש</h3>' +
      '<p style="font-size:14px;color:var(--text-muted);margin-bottom:12px">לא מצאת מה שחיפשת? תכתוב לנו ונשלח הצעת מחיר.</p>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>שם המוצר / תיאור</label><input type="text" id="npr-name" placeholder="לדוגמה: כוס נייר 6 אונ׳ לבנה" style="font-size:16px"></div>' +
        '<div class="form-group"><label>כמות משוערת (רשות)</label><input type="number" id="npr-qty" placeholder="לדוגמה: 500" min="1"></div>' +
        '<div class="form-group"><label>הערות נוספות (רשות)</label><textarea id="npr-notes" rows="2" placeholder="פרטים נוספים..."></textarea></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="CatalogView._sendProductRequest()">' +
            '<span class="material-icons-round">send</span> שלח בקשה' +
          '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
        '</div>' +
      '</div>'
    );
    setTimeout(function () {
      var inp = document.getElementById('npr-name');
      if (inp) inp.focus();
    }, 100);
  },

  _sendProductRequest: function () {
    var name = document.getElementById('npr-name');
    var qty  = document.getElementById('npr-qty');
    var notes = document.getElementById('npr-notes');
    if (!name || !name.value.trim()) { App.toast('נא להזין שם מוצר', 'warning'); return; }

    var customer = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    var settings = App.state.settings;

    var reqData = {
      customerId:   customer.id,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      productName:  name.value.trim(),
      estimatedQty: qty ? (parseInt(qty.value) || null) : null,
      notes:        notes ? notes.value.trim() : '',
      requestedAt:  new Date().toISOString(),
      status:       'pending'
    };

    /* שמירה ב-Firestore */
    if (window.DB) {
      window.DB.collection('product_requests').add(reqData)
        .catch(function (e) { console.warn('product_request save error:', e); });
    }

    /* WhatsApp למנהל */
    if (settings.adminPhone) {
      var ph = settings.adminPhone.replace(/\D/g,'');
      if (ph.startsWith('0')) ph = '972' + ph.substring(1);
      var waMsg = '📦 *בקשה למוצר חדש*\n' +
        '👤 ' + customer.name + '\n' +
        '📱 ' + (customer.phone || '—') + '\n' +
        '🛒 מוצר: ' + name.value.trim() +
        (qty && qty.value ? '\n📊 כמות משוערת: ' + qty.value : '') +
        (notes && notes.value.trim() ? '\n📝 ' + notes.value.trim() : '');
      setTimeout(function () {
        window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(waMsg), '_blank');
      }, 400);
    }

    /* מייל למנהל */
    if (settings.adminEmail) {
      var subject = 'בקשה למוצר חדש — ' + customer.name;
      var body    = 'בקשה למוצר חדש:\n\n' +
        'לקוח: ' + customer.name + ' (ח.פ: ' + customer.id + ')\n' +
        'טלפון: ' + (customer.phone || '—') + '\n\n' +
        'מוצר מבוקש: ' + name.value.trim() + '\n' +
        (qty && qty.value ? 'כמות משוערת: ' + qty.value + '\n' : '') +
        (notes && notes.value.trim() ? 'הערות: ' + notes.value.trim() + '\n' : '') +
        '\nישיר שיווק והפצה';
      setTimeout(function () {
        window.open('mailto:' + settings.adminEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
      }, 1000);
    }

    App.closeModal();
    App.toast('הבקשה נשלחה! ניצור איתך קשר בהקדם', 'success');
  }
};
