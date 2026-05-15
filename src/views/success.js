var SuccessView = {
  render: function (el, params) {
    params = params || {};
    var order = params.order || {};
    el.innerHTML =
      '<div class="success-page">' +
        '<div class="success-card">' +
          '<div class="success-logo-anim"><div class="logo-mark xl pulse">' + t('header.logoMark') + '</div></div>' +
          '<div class="success-check"><span class="material-icons-round">check_circle</span></div>' +
          '<h1 class="success-title">' + t('success.title') + '</h1>' +
          '<p class="success-sub">' + t('success.subtitle') + '</p>' +
          (order.id ? '<div class="success-order-num">' + t('success.orderNum') + ' <strong>ORD-' + order.id + '</strong></div>' : '') +
          '<div class="success-actions">' +
            '<button class="btn-primary" onclick="App.navigate(\'catalog\')">' +
              '<span class="material-icons-round">menu_book</span> ' + t('success.newOrder') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    SuccessView._lastOrder = order;
  },

  printNote: function (orderId) {
    function resolveLogoSrc() {
      var st = (window.App && App.settings) ? App.settings : {};
      var logo = st.app_logo ? st.app_logo : '';
      if (!logo) {
        try { logo = localStorage.getItem('app_logo') || ''; } catch (e) {}
      }
      if (!logo) logo = '/logo.png';
      return logo;
    }
    function lookupCustomer(ord) {
      var cid = ord && ord.customerId != null ? String(ord.customerId).trim() : '';
      if (!cid || typeof CUSTOMERS_DB === 'undefined') return null;
      var list = CUSTOMERS_DB || [];
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].hp || list[i].id || '').trim() === cid) return list[i];
      }
      return null;
    }
    function bizLineHtml(val) {
      var v = val != null ? String(val).trim() : '';
      if (v) return App.escHTML(v);
      return '<span class="dn-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';
    }
    function printStylesheetHref() {
      try {
        var u = new URL(window.location.href);
        u.hash = '';
        var p = u.pathname || '/';
        if (p.endsWith('/')) { /* ok */ }
        else if (/\.html?$/i.test(p)) { u.pathname = p.replace(/[^/]+\/?$/, ''); }
        else { u.pathname = p + '/'; }
        return new URL('src/style.css', u.origin + u.pathname).href;
      } catch (eH) {
        return 'src/style.css';
      }
    }
    function wmInlineStyle(heroLogo) {
      var s = String(heroLogo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '--dn-wm-image:url(\'' + s + '\')';
    }
    function doPrint(order) {
      if (!order.items) { App.toast(t('success.orderNotFound'), 'error'); return; }
      var isEn = I18n.getLang() === 'en';
      var dir = 'rtl';
      var locale = isEn ? 'en-US' : 'he-IL';
      var st = (window.App && App.state && App.state.settings) ? App.state.settings : {};
      var vatRate = typeof st.vatRate === 'number' && !isNaN(st.vatRate) ? st.vatRate : 0.18;
      var vatPct = Math.round(vatRate * 100);
      var vatLine = isEn ? ('VAT (' + vatPct + '%):') : ('מע״מ ' + vatPct + '%:');

      var docDate = new Date().toLocaleDateString(locale);
      var issueLabel = isEn ? 'Issue date:' : 'תאריך הפקה:';

      var cu = lookupCustomer(order);
      var shipAddr = cu && (cu.shippingAddress || cu.address) ? String(cu.shippingAddress || cu.address) : '';
      if (!shipAddr.trim()) shipAddr = '—';
      var contactNm = cu && cu.contactPerson ? String(cu.contactPerson) : '';
      var contactPh = (cu && cu.phone) || order.customerPhone || '';
      var contactLine = (contactNm || contactPh)
        ? App.escHTML((contactNm + (contactNm && contactPh ? ' · ' : '') + contactPh).trim())
        : '<span class="dn-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';

      var subtotal = parseFloat(order.subtotal) || 0;
      var savings = parseFloat(order.savings) || 0;
      var vat = parseFloat(order.vat) || 0;
      var total = parseFloat(order.total) || 0;
      var grossSum = parseFloat((subtotal + savings).toFixed(2));

      var heroLogo = resolveLogoSrc();
      var bizTaxRaw = st.businessTaxId || st.businessHp || st.companyHp || '';

      var rows = order.items.map(function (item, i) {
        var listUnit = (item.product && typeof item.product.price === 'number' && !isNaN(item.product.price))
          ? item.product.price
          : item.unitPrice;
        var q = parseInt(item.qty, 10);
        if (isNaN(q) || q < 1) q = 1;
        var lineList = parseFloat((listUnit * q).toFixed(2));
        var lineFinal = parseFloat((item.unitPrice * q).toFixed(2));
        var z = i % 2 === 0 ? 'dn-z0' : 'dn-z1';
        return '<tr class="' + z + '">' +
          '<td>' + App.escHTML(item.product && item.product.sku != null ? item.product.sku : '') + '</td>' +
          '<td class="dn-tl">' + App.escHTML(pLang(item.product, 'name')) + '</td>' +
          '<td class="dn-num">' + q + '</td>' +
          '<td class="dn-num">₪' + App.fmtP(listUnit) + '</td>' +
          '<td class="dn-num">₪' + App.fmtP(lineList) + '</td>' +
          '<td class="dn-num">' + App.fmtP(item.discountPct || 0) + '%</td>' +
          '<td class="dn-num">₪' + App.fmtP(lineFinal) + '</td>' +
        '</tr>';
      }).join('');

      var tableBlock =
        '<table class="dn-items"><thead><tr>' +
          '<th>' + App.escHTML(t('success.colSku')) + '</th>' +
          '<th class="dn-tl">' + App.escHTML(t('success.productName')) + '</th>' +
          '<th class="dn-num">' + App.escHTML(t('success.colQty')) + '</th>' +
          '<th class="dn-num">' + App.escHTML(t('success.unitPrice')) + '</th>' +
          '<th class="dn-num">' + App.escHTML(t('success.colLineGross')) + '</th>' +
          '<th class="dn-num">' + App.escHTML(t('success.colDiscPct')) + '</th>' +
          '<th class="dn-num">' + App.escHTML(t('success.colLineNet')) + '</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
        '<table class="dn-sum"><tbody>' +
          '<tr><td class="dn-lbl">' + App.escHTML(t('success.grossTotal')) + '</td><td class="dn-amt">₪' + App.fmtP(grossSum) + '</td></tr>' +
          '<tr><td class="dn-lbl">' + App.escHTML(t('success.totalDiscount')) + '</td><td class="dn-amt">₪' + App.fmtP(savings) + '</td></tr>' +
          '<tr><td class="dn-lbl">' + App.escHTML(t('success.preVatTotal')) + '</td><td class="dn-amt">₪' + App.fmtP(subtotal) + '</td></tr>' +
          '<tr><td class="dn-lbl">' + App.escHTML(vatLine) + '</td><td class="dn-amt">₪' + App.fmtP(vat) + '</td></tr>' +
          '<tr class="dn-pay"><td class="dn-lbl">' + App.escHTML(t('success.grandTotal')) + '</td><td class="dn-amt">₪' + App.fmtP(total) + '</td></tr>' +
        '</tbody></table>' +
        '<div class="dn-sign">' + App.escHTML(t('success.signatureRecipient')) + '<div class="dn-sign-line"></div></div>';

      var blocksGrid =
        '<div class="dn-grid2">' +
          '<div class="dn-blk dn-blk--customer">' +
            '<h3>' + App.escHTML(t('success.clientSection')) + '</h3>' +
            '<div class="dn-row"><span class="dn-k">' + App.escHTML(t('admin.nameCol')) + '</span><span class="dn-v">' + App.escHTML(App.orderCustomerDisplay(order)) + '</span></div>' +
            '<div class="dn-row"><span class="dn-k">' + App.escHTML(t('success.bizIdShort')) + '</span><span class="dn-v">' + App.escHTML(order.customerId != null ? String(order.customerId) : '—') + '</span></div>' +
            '<div class="dn-row"><span class="dn-k">' + App.escHTML(t('common.phone')) + '</span><span class="dn-v">' + App.escHTML(order.customerPhone || '—') + '</span></div>' +
            '<div class="dn-row"><span class="dn-k">' + App.escHTML(t('common.email')) + '</span><span class="dn-v">' + App.escHTML(order.customerEmail || '—') + '</span></div>' +
          '</div>' +
          '<div class="dn-blk">' +
            '<h3>' + App.escHTML(t('success.shipSection')) + '</h3>' +
            '<div class="dn-row"><span class="dn-k">' + App.escHTML(t('success.shipAddressLabel')) + '</span><span class="dn-v">' + App.escHTML(shipAddr) + '</span></div>' +
            '<div class="dn-row"><span class="dn-k">' + App.escHTML(t('success.contactAndPhone')) + '</span><span class="dn-v">' + contactLine + '</span></div>' +
          '</div>' +
        '</div>';

      function sheetHtml(docTitleLine) {
        return (
          '<div class="dn-sheet">' +
          '<div class="dn-bsd">' + App.escHTML(t('success.bsd')) + '</div>' +
          '<header class="dn-header-row">' +
            '<div class="dn-header-logo">' +
              '<img src="' + App.escHTML(heroLogo) + '" alt="" crossorigin="anonymous" onerror="this.src=\'/logo.png\'">' +
            '</div>' +
            '<div class="dn-header-biz">' +
              '<div class="dn-biz-line dn-biz-company">' + App.escHTML(t('success.companyName')) + '</div>' +
              '<div class="dn-biz-line">' + bizLineHtml(st.businessAddress) + '</div>' +
              '<div class="dn-biz-line">' + bizLineHtml(st.businessPhone) + '</div>' +
              '<div class="dn-biz-line">' + bizLineHtml(st.businessEmail) + '</div>' +
              '<div class="dn-biz-line"><span class="dn-biz-tax-label">' + App.escHTML(t('success.bizIdShort')) + '</span> ' +
                (String(bizTaxRaw).trim() ? App.escHTML(String(bizTaxRaw).trim()) : '<span class="dn-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>') +
              '</div>' +
            '</div>' +
          '</header>' +
          '<div class="dn-doc-title">' + App.escHTML(docTitleLine) + '</div>' +
          '<div class="dn-doc-meta"><strong>' + App.escHTML(issueLabel) + '</strong> ' + App.escHTML(docDate) + '</div>' +
          blocksGrid +
          tableBlock +
          '</div>'
        );
      }

      var titleBase = t('success.deliveryNoteNumbered') + ' ORD-' + String(order.id);
      var titleCopy = titleBase + (isEn ? ' — Copy' : ' — עותק');
      var cssHref = printStylesheetHref();

      var pdfScript =
        '(function(){' +
        'var oid=' + JSON.stringify(String(order.id)) + ';' +
        'setTimeout(function(){try{window.print();}catch(eP){}},400);' +
        'function wirePdf(){' +
        'var b=document.getElementById("dn-download-pdf");' +
        'if(!b)return;' +
        'b.onclick=function(){' +
        'var el=document.querySelector(".dn-print-root");' +
        'if(!el||!window.html2pdf)return;' +
        'html2pdf().set({' +
        'margin:10,' +
        'filename:"delivery-"+String(oid)+".pdf",' +
        'image:{type:"jpeg",quality:0.98},' +
        'html2canvas:{scale:2,useCORS:true},' +
        'jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}' +
        '}).from(el).save();' +
        '};' +
        '}' +
        'if(window.html2pdf)wirePdf();' +
        'else window.addEventListener("load",wirePdf);' +
        '})();';

      var win = window.open('', '_blank', 'width=900,height=800');
      if (!win) { App.toast(t('success.popupBlocked'), 'error'); return; }

      win.document.write(
        '<!DOCTYPE html><html dir="' + dir + '" lang="he"><head><meta charset="UTF-8">' +
        '<title>' + App.escHTML(t('success.deliveryNote')) + ' ORD-' + App.escHTML(String(order.id)) + '</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">' +
        '<link rel="stylesheet" href="' + App.escHTML(cssHref) + '">' +
        '</head><body class="dn-print-body">' +
        '<div class="dn-toolbar"><button type="button" id="dn-download-pdf">הורד PDF</button></div>' +
        '<div class="dn-print-root" style="' + wmInlineStyle(heroLogo).replace(/"/g, '&quot;') + '">' +
        '<div class="dn-page dn-original">' + sheetHtml(titleBase) + '</div>' +
        '<div class="dn-page dn-copy">' + sheetHtml(titleCopy) + '</div>' +
        '</div>' +
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>' +
        '<script>' + pdfScript + '<\/script>' +
        '</body></html>'
      );
      win.document.close();
    }

    var oid = String(orderId);
    function fromMemory() {
      var o = App.Orders.getAll().find(function (x) { return String(x.id) === oid; });
      if (!o && typeof AdminView !== 'undefined' && AdminView._lastOrders) {
        o = AdminView._lastOrders.find(function (x) { return String(x.id) === oid; });
      }
      if (!o && SuccessView._lastOrder && String(SuccessView._lastOrder.id) === oid) {
        o = SuccessView._lastOrder;
      }
      return (o && o.items) ? o : null;
    }

    if (window.DB) {
      window.DB.collection('orders').doc(oid).get({ source: 'server' })
        .then(function (doc) {
          if (doc.exists && doc.data().items) {
            doPrint(doc.data());
            return;
          }
          var mem = fromMemory();
          if (mem) doPrint(mem);
          else App.toast(t('success.orderNotFound'), 'error');
        })
        .catch(function () {
          window.DB.collection('orders').doc(oid).get({ source: 'cache' })
            .then(function (doc) {
              if (doc.exists && doc.data().items) doPrint(doc.data());
              else {
                var mem = fromMemory();
                if (mem) doPrint(mem);
                else App.toast(t('success.orderNotFound'), 'error');
              }
            })
            .catch(function () {
              var mem = fromMemory();
              if (mem) doPrint(mem);
              else App.toast(t('success.orderNotFound'), 'error');
            });
        });
      return;
    }

    var mem = fromMemory();
    if (mem) doPrint(mem);
    else App.toast(t('success.orderNotFound'), 'error');
  },

  _lastOrder: null
};
