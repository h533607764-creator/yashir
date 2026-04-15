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
    /* הודעת מינימום הסרה מכאן — מופיעה רק בסיום הזמנה */
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
    /* מיון לפי מק"ט */
    var list = PRODUCTS.slice().sort(function (a, b) { return (a.sku || '').localeCompare(b.sku || ''); });

    if (CatalogView._cat !== 'all') list = list.filter(function (p) { return p.category === CatalogView._cat; });
    if (CatalogView._q) {
      var q = CatalogView._q.toLowerCase();
      list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) > -1 || (p.sku || '').indexOf(q) > -1; });
    }

    /* תצוגה אישית — רק מוצרים עם מחיר אישי */
    if (cust && CatalogView._section === 'personal') {
      list = list.filter(function (p) { return App.Pricing.hasPersonal(p, cust); });
    }
    /* קטלוג מלא — כל המוצרים (כולל אישיים) */
    /* אין פילטור נוסף בקטלוג מלא */

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
    var showPrice = isAdmin || !!cust;
    var unitPrice = showPrice ? (isAdmin ? product.price : App.Pricing.getUnitPrice(product, cust)) : null;
    var discPct  = cust ? App.Pricing.getDiscountPct(product, cust) : 0;
    /* "מחיר מיוחד בשבילך" — מופיע רק בקטלוג המלא ורק למוצרים עם מחיר אישי */
    var showPersonalBadge = (section === 'full') && !!cust && App.Pricing.hasPersonal(product, cust);

    var priceHTML = showPrice
      ? '<div class="card-price-row">' +
          '<span class="price-symbol">₪</span>' +
          '<span class="price-amount">' + App.fmtP(unitPrice) + '</span>' +
          '<span class="price-unit"> / ' + product.unit + '</span>' +
          (discPct > 0 ? '<span class="discount-badge">-' + discPct + '%</span>' : '') +
        '</div>'
      : '<div class="card-price-row guest">התחבר לצפייה במחיר</div>';

    var orderHTML = '';
    if (cust) {
      if (inStock) {
        orderHTML =
          '<div class="card-order-row">' +
            '<div class="qty-wrap">' +
              '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',-1)">−</button>' +
              '<input class="qty-input" type="number" id="qty-' + product.id + '" value="1" min="1" max="999">' +
              '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',1)">+</button>' +
            '</div>' +
            '<button class="btn-add-cart" onclick="CatalogView._add(\'' + product.id + '\')">' +
              '<span class="material-icons-round">add_shopping_cart</span> הוסף' +
            '</button>' +
          '</div>';
      } else {
        /* חסר במלאי — מאפשר הזמנה עם אזהרה */
        orderHTML =
          '<div class="card-order-row">' +
            '<div class="qty-wrap">' +
              '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',-1)">−</button>' +
              '<input class="qty-input" type="number" id="qty-' + product.id + '" value="1" min="1" max="999">' +
              '<button class="qty-btn" onclick="CatalogView._qty(\'' + product.id + '\',1)">+</button>' +
            '</div>' +
            '<button class="btn-add-cart oos" onclick="CatalogView._add(\'' + product.id + '\')">' +
              '<span class="material-icons-round">add_shopping_cart</span> הוסף' +
            '</button>' +
          '</div>' +
          '<div class="oos-warning"><span class="material-icons-round">schedule</span> עלול להתעכב — חסר במלאי</div>';
      }
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
        priceHTML + orderHTML +
      '</div>' +
    '</article>';
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
    if (inp) inp.value = Math.max(1, Math.min(999, parseInt(inp.value || 1) + d));
  },
  _add: function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var inp = document.getElementById('qty-' + id);
    var qty = inp ? parseInt(inp.value) || 1 : 1;
    App.Cart.add(p, qty);
    if (inp) inp.value = 1;
  }
};
