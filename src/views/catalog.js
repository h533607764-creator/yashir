var CatalogView = {
  _selectedCats: [],
  _selectedSubcats: [],
  _q: '',
  _section: 'personal',

  render: function (el, params) {
    params = params || {};
    if (params.section) CatalogView._section = params.section;
    var isCust  = App.Auth.isCustomer();
    var isAdmin = App.Auth.isAdmin();

    var cats = [];
    var subcats = [];
    var seenCat = {};
    var seenSub = {};
    PRODUCTS.forEach(function (p) {
      if (p.category && p.category !== 'shipping' && !seenCat[p.category]) {
        seenCat[p.category] = true;
        cats.push({ id: p.category, label: (p.icon ? p.icon + ' ' : '') + (pLang(p, 'categoryLabel') || p.category) });
      }
      if (p.subcategory && p.category !== 'shipping' && !seenSub[p.subcategory]) {
        seenSub[p.subcategory] = true;
        subcats.push({ id: p.subcategory, label: pLang(p, 'subcategoryLabel') || p.subcategory, cat: p.category });
      }
    });

    var hasFilters = CatalogView._selectedCats.length > 0 || CatalogView._selectedSubcats.length > 0;

    var visibleSubcats = subcats;
    if (CatalogView._selectedCats.length > 0) {
      visibleSubcats = subcats.filter(function (s) {
        return CatalogView._selectedCats.indexOf(s.cat) > -1;
      });
    }

    el.innerHTML =
      '<div class="catalog-page">' +
        '<div class="catalog-toolbar">' +
          '<div class="container">' +
            '<div class="search-wrap">' +
              '<span class="material-icons-round">search</span>' +
              '<input type="text" id="cv-search" placeholder="' + t('catalog.searchPlaceholder') + '" oninput="CatalogView.onSearch(this.value)" value="' + CatalogView._q + '">' +
            '</div>' +
            '<div class="filter-section">' +
              '<div class="filter-row">' +
                '<span class="filter-label">' + t('catalog.categories') + ':</span>' +
                '<div class="cat-scroll">' +
                  cats.map(function (c) {
                    var isActive = CatalogView._selectedCats.indexOf(c.id) > -1;
                    return '<button class="cat-btn' + (isActive ? ' active' : '') + '" onclick="CatalogView.toggleCat(\'' + c.id + '\')">' + c.label + '</button>';
                  }).join('') +
                '</div>' +
              '</div>' +
              (visibleSubcats.length > 0 ?
                '<div class="filter-row">' +
                  '<span class="filter-label">' + t('catalog.subcategories') + ':</span>' +
                  '<div class="cat-scroll" id="cv-subcat-scroll">' +
                    visibleSubcats.map(function (s) {
                      var isActive = CatalogView._selectedSubcats.indexOf(s.id) > -1;
                      return '<button class="cat-btn subcat-btn' + (isActive ? ' active' : '') + '" onclick="CatalogView.toggleSubcat(\'' + s.id + '\')">' + s.label + '</button>';
                    }).join('') +
                  '</div>' +
                '</div>'
              : '') +
              (hasFilters ?
                '<button class="btn-clear-filters" onclick="CatalogView.clearFilters()">' +
                  '<span class="material-icons-round">filter_list_off</span> ' + t('catalog.clearFilters') +
                '</button>'
              : '') +
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
    if (isAdmin) return '<div class="section-label full"><span class="material-icons-round">admin_panel_settings</span> ' + t('catalog.adminView') + '</div>';
    if (CatalogView._section === 'personal') {
      return '<div class="section-label"><span class="material-icons-round">star</span> ' + t('catalog.personalProducts') + '</div>';
    }
    return '<div class="section-label full"><span class="material-icons-round">menu_book</span> ' + t('catalog.fullCatalog') +
      '<button class="btn-back-personal" onclick="CatalogView.render(document.getElementById(\'view-content\'),{section:\'personal\'})">' +
        '<span class="material-icons-round">' + (I18n.getLang() === 'en' ? 'arrow_back' : 'arrow_forward') + '</span> ' + t('catalog.backToPersonal') +
      '</button></div>';
  },

  _getProducts: function () {
    var cust = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    var list = PRODUCTS.slice().sort(function (a, b) { return (a.sku || '').localeCompare(b.sku || ''); });

    if (CatalogView._selectedCats.length > 0) {
      list = list.filter(function (p) { return CatalogView._selectedCats.indexOf(p.category) > -1; });
    }
    if (CatalogView._selectedSubcats.length > 0) {
      list = list.filter(function (p) { return CatalogView._selectedSubcats.indexOf(p.subcategory) > -1; });
    }
    if (CatalogView._q) {
      var q = CatalogView._q.toLowerCase();
      list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) > -1 || (p.name_en || '').toLowerCase().indexOf(q) > -1 || (p.sku || '').indexOf(q) > -1; });
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
      grid.innerHTML = '<div class="empty-grid"><span class="material-icons-round">inventory_2</span><p>' + t('catalog.noProducts') + '</p></div>';
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
        '<span class="material-icons-round">expand_more</span><span>' + t('catalog.toFullCatalog') + '</span><span class="material-icons-round">menu_book</span></div>';
    }
  },

  _card: function (product, cust, isAdmin, section) {
    var inStock  = product.stock > 0;
    var hasPersonal = cust && App.Pricing.hasPersonal(product, cust);
    var showPrice = isAdmin || hasPersonal || (cust && section !== 'full') || (cust && App.Pricing.getDiscountPct(product, cust) === 0 && cust.generalDiscount === 0 && !hasPersonal && section !== 'full');
    if (cust && section === 'personal') showPrice = true;
    if (cust && section === 'full') showPrice = hasPersonal;

    var unitPrice = showPrice ? (isAdmin ? product.price : App.Pricing.getUnitPrice(product, cust)) : null;
    var discPct   = cust ? App.Pricing.getDiscountPct(product, cust) : 0;
    var showPersonalBadge = (section === 'full') && hasPersonal;

    var productInfoHTML = '';
    if (product.unitsPerPackage) {
      productInfoHTML += '<span class="prod-info-tag"><span class="material-icons-round">inventory_2</span>' + product.unitsPerPackage + ' ' + t('catalog.unitsInPack') + '</span>';
    }
    if (product.soldBy) {
      productInfoHTML += '<span class="prod-info-tag"><span class="material-icons-round">local_shipping</span>' + t('catalog.soldBy') + ' ' + pLang(product, 'soldBy') + '</span>';
    }
    if (product.unitsPerContainer) {
      productInfoHTML += '<span class="prod-info-tag"><span class="material-icons-round">straighten</span>' + product.unitsPerContainer + ' ' + t('catalog.unitsIn') + (pLang(product, 'soldBy') || (I18n.getLang() === 'en' ? 'pack' : 'אריזה')) + '</span>';
    }

    var bulkDiscHTML = '';
    if (product.bulkDiscounts && product.bulkDiscounts.length && showPrice) {
      var bulkItems = product.bulkDiscounts.map(function (d) {
        return '<span class="bulk-disc-item">' + t('catalog.from') + d.minQty + ' ' + (pLang(product, 'soldBy') || t('common.units')) + ': <strong>-' + d.discountPct + '%</strong></span>';
      }).join('');
      bulkDiscHTML = '<div class="bulk-disc-banner"><span class="material-icons-round">local_offer</span><span>' + t('catalog.bulkDiscount') + ' ' + bulkItems + '</span></div>';
    }

    var priceHTML = '';
    if (showPrice) {
      priceHTML = '<div class="card-price-row">' +
        '<span class="price-symbol">₪</span>' +
        '<span class="price-amount">' + App.fmtP(unitPrice) + '</span>' +
        (discPct > 0 ? '<span class="discount-badge">-' + discPct + '%</span>' : '') +
      '</div>';
    } else if (cust && section === 'full') {
      priceHTML = '<div class="card-price-row guest-quote">' + t('catalog.personalQuote') + '</div>';
    } else if (!cust && !isAdmin) {
      priceHTML = '<div class="card-price-row guest">' + t('catalog.loginToOrder') + '</div>';
    }

    var orderHTML = '';
    if (cust && section === 'full' && !hasPersonal) {
      orderHTML = '<button class="btn-quote-request" onclick="CatalogView.requestQuote(\'' + product.id + '\')">' +
        '<span class="material-icons-round">request_quote</span> ' + t('catalog.requestQuote') +
      '</button>';
    } else if (cust) {
      var qtyId = 'qty-' + product.id;
      var cartItem = App.state.cart.find(function (i) { return i.product.id === product.id; });
      var cartQty  = cartItem ? cartItem.qty : 0;
      var inCartBadge = cartQty > 0
        ? '<div class="in-cart-badge"><span class="material-icons-round">shopping_cart</span> ' + cartQty + ' ' + t('catalog.inCart') + '</div>'
        : '';

      orderHTML =
        inCartBadge +
        '<div class="card-order-row">' +
          '<div class="qty-wrap">' +
            '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',-1)">−</button>' +
            '<input class="qty-input' + (cartQty > 0 ? ' in-cart' : '') + '" type="number" id="' + qtyId + '" value="' + cartQty + '" min="0" max="999" oninput="CatalogView._updateLineTotal(\'' + product.id + '\')">' +
            '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',1)">+</button>' +
          '</div>' +
          '<button class="btn-add-cart' + (!inStock ? ' oos' : '') + '" onclick="CatalogView._add(\'' + product.id + '\')">' +
            '<span class="material-icons-round">' + (cartQty > 0 ? 'shopping_cart' : 'add_shopping_cart') + '</span> ' + (cartQty > 0 ? t('catalog.update') : t('catalog.addToCart')) +
          '</button>' +
        '</div>' +
        '<div id="line-info-' + product.id + '" class="line-total-wrap"></div>' +
        (!inStock ? '<div class="oos-warning"><span class="material-icons-round">schedule</span> ' + t('catalog.oosDelay') + '</div>' : '');
    } else if (!cust && !isAdmin) {
      orderHTML = '<button class="btn-login-to-order" onclick="App.navigate(\'login\')">' +
        '<span class="material-icons-round">lock</span> ' + t('catalog.loginToOrderBtn') + '</button>';
    }

    return '<article class="product-card' + (inStock ? '' : ' oos-card') + '">' +
      '<div class="card-img-wrap" style="background:' + product.bgColor + '">' +
        (product.image
          ? '<img src="' + CloudinaryUpload.buildCatalogUrl(product.image) + '" alt="' + pLang(product, 'name') + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'
          : '<span class="card-icon">' + product.icon + '</span>') +
        '<span class="stock-badge ' + (inStock ? 'in' : 'out') + '">' + (inStock ? t('catalog.inStock') : t('catalog.outOfStock')) + '</span>' +
        (showPersonalBadge ? '<span class="personal-badge"><span class="material-icons-round">star</span> ' + t('catalog.specialPrice') + '</span>' : '') +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-meta"><span class="card-sku">' + t('common.sku') + ' ' + App.escHTML(product.sku) + '</span><span class="card-cat">' + App.escHTML(pLang(product, 'categoryLabel')) + (pLang(product, 'subcategoryLabel') ? ' / ' + App.escHTML(pLang(product, 'subcategoryLabel')) : '') + '</span></div>' +
        '<h3 class="card-name">' + App.escHTML(pLang(product, 'name')) + '</h3>' +
        '<p class="card-desc">' + App.escHTML(pLang(product, 'description')) + '</p>' +
        (productInfoHTML ? '<div class="prod-info-tags">' + productInfoHTML + '</div>' : '') +
        bulkDiscHTML +
        priceHTML +
        orderHTML +
      '</div>' +
    '</article>';
  },

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
        html = '<div class="line-total bulk-active">' +
          '<span class="line-orig">₪' + App.fmtP(basePrice * qty) + '</span>' +
          '<span class="line-disc-label">' + t('catalog.bulkDiscountLabel') + ' -' + bulkPct + '%</span>' +
          '<span class="line-final">' + t('catalog.lineTotal') + ' ₪' + App.fmtP(effectiveP * qty) + '</span>' +
        '</div>';
      } else {
        html = '<div class="line-total">' +
          '<span class="line-final">' + t('catalog.lineTotal') + ' ₪' + App.fmtP(basePrice * qty) + '</span>' +
        '</div>';
        var next = App.Pricing.getNextBulkThreshold(product, qty);
        if (next) {
          html += '<div class="next-bulk-hint"><span class="material-icons-round">local_offer</span>' + t('catalog.moreFor') + ' ' + (next.minQty - qty) + ' ' + (pLang(product, 'soldBy') || t('common.units')) + ' ' + t('catalog.toGet') + ' ' + next.discountPct + '%</div>';
        }
      }
    } else if (qty === 1) {
      var nextDisc = App.Pricing.getNextBulkThreshold(product, qty);
      if (nextDisc) {
        html = '<div class="next-bulk-hint"><span class="material-icons-round">local_offer</span>' + t('catalog.order') + ' ' + nextDisc.minQty + ' ' + (pLang(product, 'soldBy') || t('common.units')) + ' ' + t('catalog.toGet') + ' ' + nextDisc.discountPct + '%</div>';
      }
    }
    infoEl.innerHTML = html;
  },

  toggleCat: function (cat) {
    var idx = CatalogView._selectedCats.indexOf(cat);
    if (idx > -1) {
      CatalogView._selectedCats.splice(idx, 1);
    } else {
      CatalogView._selectedCats.push(cat);
    }
    CatalogView._selectedSubcats = CatalogView._selectedSubcats.filter(function (subId) {
      return PRODUCTS.some(function (p) {
        return p.subcategory === subId &&
          (CatalogView._selectedCats.length === 0 || CatalogView._selectedCats.indexOf(p.category) > -1);
      });
    });
    CatalogView.render(document.getElementById('view-content'));
  },
  toggleSubcat: function (subcat) {
    var idx = CatalogView._selectedSubcats.indexOf(subcat);
    if (idx > -1) {
      CatalogView._selectedSubcats.splice(idx, 1);
    } else {
      CatalogView._selectedSubcats.push(subcat);
    }
    CatalogView._renderGrid();
    document.querySelectorAll('.subcat-btn').forEach(function (b) {
      var id = b.getAttribute('onclick').match(/toggleSubcat\('([^']+)'\)/);
      if (id) b.classList.toggle('active', CatalogView._selectedSubcats.indexOf(id[1]) > -1);
    });
  },
  clearFilters: function () {
    CatalogView._selectedCats = [];
    CatalogView._selectedSubcats = [];
    CatalogView.render(document.getElementById('view-content'));
  },
  onSearch: function (q) { CatalogView._q = q; CatalogView._renderGrid(); },
  _qty: function (id, d) {
    var inp = document.getElementById('qty-' + id);
    if (!inp) return;
    var newVal = Math.max(0, Math.min(999, parseInt(inp.value || 0) + d));
    inp.value = newVal;
    inp.classList.toggle('in-cart', newVal > 0);
    CatalogView._updateLineTotal(id);
    if (newVal === 0) {
      App.Cart.remove(id);
    } else {
      var p = PRODUCTS.find(function (x) { return x.id === id; });
      if (!p) return;
      var cItem = App.state.cart.find(function (i) { return i.product.id === id; });
      if (cItem) {
        App.Cart.updateQty(id, newVal);
      } else {
        App.Cart.add(p, newVal);
      }
    }
  },
  _add: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var inp = document.getElementById('qty-' + id);
    var qty = inp ? parseInt(inp.value) || 0 : 0;
    if (qty <= 0) return;
    var cItem = App.state.cart.find(function (i) { return i.product.id === id; });
    if (cItem) {
      App.Cart.updateQty(id, qty);
      App.toast(t('catalog.qtyUpdated'), 'success');
    } else {
      App.Cart.add(p, qty);
    }
  },

  goFullCatalog: function () {
    CatalogView.render(document.getElementById('view-content'), { section: 'full' });
  },

  requestQuote: function (productId) {
    var product = PRODUCTS.find(function (p) { return p.id === productId; });
    if (!product) return;
    var customer = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    if (!customer) { App.toast(t('catalog.loginFirst'), 'warning'); return; }

    App.showModal(
      '<div class="sys-message">' +
        '<div class="sys-icon" style="background:var(--blue-dim);color:var(--blue)"><span class="material-icons-round" style="font-size:30px">request_quote</span></div>' +
        '<h3>' + t('catalog.quoteModalTitle') + '</h3>' +
        '<p>' + t('catalog.quoteModalText') + '<br><strong>' + App.escHTML(pLang(product, 'name')) + '</strong></p>' +
        '<p style="font-size:13px;color:var(--text-muted)">' + t('catalog.quoteModalNote') + '</p>' +
        '<div style="display:flex;gap:10px;margin-top:12px;width:100%">' +
          '<button class="btn-primary full-width" onclick="CatalogView._confirmQuote(\'' + productId + '\')">' +
            '<span class="material-icons-round">send</span> ' + t('catalog.sendRequest') +
          '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
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

    if (window.DB) {
      window.DB.collection('quote_requests').add(reqData)
        .catch(function (e) { console.warn('quote_request save error:', e); });
    }

    if (settings.adminPhone) {
      var ph = settings.adminPhone.replace(/\D/g,'');
      if (ph.startsWith('0')) ph = '972' + ph.substring(1);
      var waMsg = '💰 *' + t('catalog.quoteModalTitle') + '*\n' +
        '👤 ' + customer.name + '\n' +
        '📱 ' + (customer.phone || '—') + '\n' +
        '📦 ' + pLang(product, 'name') + ' (' + t('common.sku') + ' ' + product.sku + ')';
      setTimeout(function () {
        window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(waMsg), '_blank');
      }, 400);
    }

    if (settings.adminEmail) {
      var subject = t('catalog.quoteModalTitle') + ' — ' + customer.name + ' / ' + pLang(product, 'name');
      var body    = t('catalog.quoteModalTitle') + ':\n\n' +
        customer.name + ' (' + customer.id + ')\n' +
        (customer.phone || '—') + '\n\n' +
        pLang(product, 'name') + '\n' +
        t('common.sku') + ': ' + product.sku + '\n\n' +
        t('success.companyName');
      setTimeout(function () {
        window.open('mailto:' + settings.adminEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
      }, 1000);
    }

    App.closeModal();
    App.toast(t('catalog.requestSent'), 'success');
  },

  requestNewProduct: function () {
    var customer = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
    if (!customer) { App.navigate('login'); return; }

    App.showModal(
      '<h3><span class="material-icons-round">add_circle</span> ' + t('catalog.newProductTitle') + '</h3>' +
      '<p style="font-size:14px;color:var(--text-muted);margin-bottom:12px">' + t('catalog.newProductText') + '</p>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>' + t('catalog.productNameLabel') + '</label><input type="text" id="npr-name" placeholder="' + t('catalog.productNamePlaceholder') + '" style="font-size:16px"></div>' +
        '<div class="form-group"><label>' + t('catalog.estQtyLabel') + '</label><input type="number" id="npr-qty" placeholder="' + t('catalog.estQtyPlaceholder') + '" min="1"></div>' +
        '<div class="form-group"><label>' + t('catalog.extraNotesLabel') + '</label><textarea id="npr-notes" rows="2" placeholder="' + t('catalog.extraNotesPlaceholder') + '"></textarea></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="CatalogView._sendProductRequest()">' +
            '<span class="material-icons-round">send</span> ' + t('catalog.sendRequest') +
          '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
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
    if (!name || !name.value.trim()) { App.toast(t('catalog.enterProductName'), 'warning'); return; }

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

    if (window.DB) {
      window.DB.collection('product_requests').add(reqData)
        .catch(function (e) { console.warn('product_request save error:', e); });
    }

    if (settings.adminPhone) {
      var ph = settings.adminPhone.replace(/\D/g,'');
      if (ph.startsWith('0')) ph = '972' + ph.substring(1);
      var waMsg = '📦 *' + t('catalog.newProductTitle') + '*\n' +
        '👤 ' + customer.name + '\n' +
        '📱 ' + (customer.phone || '—') + '\n' +
        '🛒 ' + name.value.trim() +
        (qty && qty.value ? '\n📊 ' + qty.value : '') +
        (notes && notes.value.trim() ? '\n📝 ' + notes.value.trim() : '');
      setTimeout(function () {
        window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(waMsg), '_blank');
      }, 400);
    }

    if (settings.adminEmail) {
      var subject = t('catalog.newProductTitle') + ' — ' + customer.name;
      var body    = t('catalog.newProductTitle') + ':\n\n' +
        customer.name + ' (' + customer.id + ')\n' +
        (customer.phone || '—') + '\n\n' +
        name.value.trim() + '\n' +
        (qty && qty.value ? qty.value + '\n' : '') +
        (notes && notes.value.trim() ? notes.value.trim() + '\n' : '') +
        '\n' + t('success.companyName');
      setTimeout(function () {
        window.open('mailto:' + settings.adminEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
      }, 1000);
    }

    App.closeModal();
    App.toast(t('catalog.requestSent'), 'success');
  }
};
