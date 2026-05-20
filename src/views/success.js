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
    function bizValHtml(val) {
      var v = val != null ? String(val).trim() : '';
      if (v) return App.escHTML(v);
      return '<span class="erp-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';
    }
    function fieldLine(label, valueHtml) {
      return '<div class="erp-line">' +
        '<span class="erp-k">' + App.escHTML(label) + '</span>' +
        '<span class="erp-v">' + valueHtml + '</span></div>';
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
    function logoVarStyle(heroLogo) {
      var s = String(heroLogo || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return '--erp-logo:url(\'' + s + '\')';
    }
    function doPrint(order) {
      if (!order.items) { App.toast(t('success.orderNotFound'), 'error'); return; }
      var isEn = I18n.getLang() === 'en';
      var dir = 'rtl';
      var locale = isEn ? 'en-US' : 'he-IL';
      var st = (window.App && App.state && App.state.settings) ? App.state.settings : {};
      var vatRate = typeof st.vatRate === 'number' && !isNaN(st.vatRate) ? st.vatRate : 0.18;
      var vatPct = Math.round(vatRate * 100);
      var vatLine = isEn ? ('VAT (' + vatPct + '%)') : ('מע״מ ' + vatPct + '%');

      var docDate = new Date().toLocaleDateString(locale);
      var docTs = new Date().toLocaleString(locale);
      var bizTaxLbl = isEn ? 'Tax ID' : 'ח.פ';
      var custTaxLbl = isEn ? 'Tax ID' : 'ח.פ';
      var numLbl = isEn ? 'No.' : 'מספר';

      var cu = lookupCustomer(order);
      var shipAddr = cu && (cu.shippingAddress || cu.address) ? String(cu.shippingAddress || cu.address) : '';
      if (!shipAddr.trim()) shipAddr = '—';
      var custAddr = cu && cu.address ? String(cu.address).trim() : '';
      if (!custAddr.trim()) custAddr = '—';
      var contactNm = cu && cu.contactPerson ? String(cu.contactPerson).trim() : '';
      var contactPhRaw = (cu && cu.phone) ? String(cu.phone).trim() : '';
      var contactPh = contactPhRaw || (order.customerPhone ? String(order.customerPhone).trim() : '');
      var contactNmHtml = contactNm
        ? App.escHTML(contactNm)
        : '<span class="erp-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';
      var contactPhHtml = contactPh
        ? App.escHTML(contactPh)
        : '<span class="erp-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';

      var subtotal = parseFloat(order.subtotal) || 0;
      var savings = parseFloat(order.savings) || 0;
      var vat = parseFloat(order.vat) || 0;
      var total = parseFloat(order.total) || 0;
      var grossSum = parseFloat((subtotal + savings).toFixed(2));

      var heroLogo = resolveLogoSrc();
      var bizTaxDisp = String(st.businessTaxId || st.businessHp || st.vatId || st.companyHp || '').trim();
      var coLine = isEn ? t('success.companyName') : ('ישיר' + '\u00A0' + 'שיווק' + '\u00A0' + 'והפצה');
      var docTitle = isEn ? t('success.deliveryNote') : 'תעודת משלוח';
      var ordOnly = 'ORD-' + String(order.id);
      var copyBadge = isEn ? 'COPY' : 'עותק';
      var footerCo = coLine;

      var colSku = isEn ? t('success.colSku') : 'מק"ט';
      var colProd = isEn ? t('success.productName') : 'מוצר';
      var colQty = isEn ? t('success.colQty') : 'כמות';
      var colUnit = isEn ? t('success.unitPrice') : 'מחיר יח\'';
      var colLine = isEn ? t('success.colLineGross') : 'סה"כ';
      var colDisc = isEn ? t('success.colDiscPct') : 'הנחה %';
      var colNet = isEn ? t('success.colLineNet') : 'סה"כ סופי';

      var rows = order.items.map(function (item) {
        var listUnit = (item.product && typeof item.product.price === 'number' && !isNaN(item.product.price))
          ? item.product.price
          : item.unitPrice;
        var q = parseInt(item.qty, 10);
        if (isNaN(q) || q < 1) q = 1;
        var lineList = parseFloat((listUnit * q).toFixed(2));
        var lineFinal = parseFloat((item.unitPrice * q).toFixed(2));
        return '<tr>' +
          '<td class="erp-col-sku">' + App.escHTML(item.product && item.product.sku != null ? item.product.sku : '') + '</td>' +
          '<td class="erp-col-prod erp-tl">' + App.escHTML(pLang(item.product, 'name')) + '</td>' +
          '<td class="erp-num erp-col-qty">' + q + '</td>' +
          '<td class="erp-num erp-col-unit">₪' + App.fmtP(listUnit) + '</td>' +
          '<td class="erp-num erp-col-line">₪' + App.fmtP(lineList) + '</td>' +
          '<td class="erp-num erp-col-disc">' + App.fmtP(item.discountPct || 0) + '%</td>' +
          '<td class="erp-num erp-col-net">₪' + App.fmtP(lineFinal) + '</td>' +
        '</tr>';
      }).join('');

      var itemsTable =
        '<div class="erp-table-wrap">' +
        '<table class="erp-items">' +
        '<thead><tr>' +
          '<th class="erp-col-sku">' + App.escHTML(colSku) + '</th>' +
          '<th class="erp-col-prod erp-tl">' + App.escHTML(colProd) + '</th>' +
          '<th class="erp-col-qty">' + App.escHTML(colQty) + '</th>' +
          '<th class="erp-col-unit">' + App.escHTML(colUnit) + '</th>' +
          '<th class="erp-col-line">' + App.escHTML(colLine) + '</th>' +
          '<th class="erp-col-disc">' + App.escHTML(colDisc) + '</th>' +
          '<th class="erp-col-net">' + App.escHTML(colNet) + '</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr class="erp-tfoot-spacer"><td colspan="7"></td></tr></tfoot>' +
        '</table></div>';

      var summaryBlock =
        '<div class="erp-summary-box">' +
        '<table class="erp-sum"><tbody>' +
          '<tr><td class="erp-lbl">' + App.escHTML(t('success.grossTotal')) + '</td>' +
            '<td class="erp-amt erp-num">₪' + App.fmtP(grossSum) + '</td></tr>' +
          '<tr><td class="erp-lbl">' + App.escHTML(t('success.totalDiscount')) + '</td>' +
            '<td class="erp-amt erp-num">₪' + App.fmtP(savings) + '</td></tr>' +
          '<tr><td class="erp-lbl">' + App.escHTML(t('success.preVatTotal')) + '</td>' +
            '<td class="erp-amt erp-num">₪' + App.fmtP(subtotal) + '</td></tr>' +
          '<tr><td class="erp-lbl">' + App.escHTML(vatLine) + '</td>' +
            '<td class="erp-amt erp-num">₪' + App.fmtP(vat) + '</td></tr>' +
          '<tr class="erp-pay"><td class="erp-lbl">' + App.escHTML(t('success.grandTotal')) + '</td>' +
            '<td class="erp-amt erp-num">₪' + App.fmtP(total) + '</td></tr>' +
        '</tbody></table></div>';

      var signLbl = isEn ? 'Recipient signature' : 'חתימת מקבל';
      var dateLbl = isEn ? 'Date' : 'תאריך';
      var signBlock =
        '<div class="erp-sign-row">' +
          '<div class="erp-sign">' +
            '<div class="erp-sign-line"></div>' +
            '<span class="erp-sign-lbl">' + App.escHTML(signLbl) + '</span>' +
          '</div>' +
          '<div class="erp-sign erp-sign--date">' +
            '<div class="erp-sign-line"></div>' +
            '<span class="erp-sign-lbl">' + App.escHTML(dateLbl) + '</span>' +
          '</div>' +
        '</div>';

      var custColTitle = isEn ? t('success.clientSection') : 'לקוח';
      var shipColTitle = isEn ? t('success.shipSection') : 'משלוח';
      var custBlock =
        '<section class="erp-parties">' +
          '<div class="erp-card erp-party">' +
            '<div class="erp-card-head">' + App.escHTML(custColTitle) + '</div>' +
            fieldLine(t('admin.nameCol'), App.escHTML(App.orderCustomerDisplay(order))) +
            fieldLine(custTaxLbl, App.escHTML(order.customerId != null ? String(order.customerId) : '—')) +
            fieldLine(t('common.phone'), App.escHTML(order.customerPhone || '—')) +
            fieldLine(t('common.email'), App.escHTML(order.customerEmail || '—')) +
            fieldLine(isEn ? 'Address' : 'כתובת', App.escHTML(custAddr)) +
          '</div>' +
          '<div class="erp-card erp-party">' +
            '<div class="erp-card-head">' + App.escHTML(shipColTitle) + '</div>' +
            fieldLine(t('success.shipAddressLabel'), App.escHTML(shipAddr)) +
            fieldLine(isEn ? 'Contact' : 'איש קשר', contactNmHtml) +
            fieldLine(t('common.phone'), contactPhHtml) +
          '</div>' +
        '</section>';

      function pageFooter() {
        return '<footer class="erp-foot">' +
          '<span class="erp-foot-co">' + App.escHTML(footerCo) + '</span>' +
          '<span class="erp-foot-ts erp-num">' + App.escHTML(docTs) + '</span>' +
          '<span class="erp-foot-pg"></span>' +
        '</footer>';
      }

      function pageContent(forCopy) {
        var copyExtra = forCopy
          ? '<span class="erp-copy-badge" aria-hidden="true">' + App.escHTML(copyBadge) + '</span>'
          : '';
        return (
          '<div class="erp-bsd">' + App.escHTML(t('success.bsd')) + '</div>' +
          copyExtra +
          '<header class="erp-head">' +
            '<div class="erp-head-logo">' +
              '<img class="erp-logo-lg" src="' + App.escHTML(heroLogo) + '" alt="" crossorigin="anonymous" onerror="this.src=\'/logo.png\'">' +
            '</div>' +
            '<div class="erp-head-center">' +
              '<div class="erp-doc-title">' + App.escHTML(docTitle) + (forCopy ? (isEn ? ' — Copy' : ' — עותק') : '') + '</div>' +
              '<div class="erp-doc-num-lbl">' + App.escHTML(numLbl) + '</div>' +
              '<div class="erp-doc-ord erp-ltr">' + App.escHTML(ordOnly) + '</div>' +
            '</div>' +
            '<div class="erp-card erp-head-biz">' +
              '<div class="erp-line erp-biz-name"><span class="erp-v">' + App.escHTML(coLine) + '</span></div>' +
              fieldLine(isEn ? 'Address' : 'כתובת', bizValHtml(st.businessAddress)) +
              fieldLine(t('common.phone'), bizValHtml(st.businessPhone)) +
              fieldLine(t('common.email'), bizValHtml(st.businessEmail)) +
              fieldLine(bizTaxLbl, bizTaxDisp ? App.escHTML(bizTaxDisp) : '<span class="erp-ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>') +
              '<div class="erp-date erp-num erp-ltr">' + App.escHTML(docDate) + '</div>' +
            '</div>' +
          '</header>' +
          custBlock +
          '<div class="erp-body">' +
            itemsTable +
            '<div class="erp-close">' +
              summaryBlock +
              signBlock +
            '</div>' +
          '</div>' +
          pageFooter()
        );
      }

      function erpPage(forCopy) {
        var cls = 'erp-page ' + (forCopy ? 'erp-page--copy' : 'erp-page--original');
        return '<section class="' + cls + '"><div class="erp-page-inner">' + pageContent(forCopy) + '</div></section>';
      }

      var cssHref = printStylesheetHref();
      var logoStyle = logoVarStyle(heroLogo);

      var pdfScript =
        '(function(){' +
        'var oid=' + JSON.stringify(String(order.id)) + ';' +
        'setTimeout(function(){try{window.print();}catch(eP){}},400);' +
        'function wirePdf(){' +
        'var b=document.getElementById("dn-download-pdf");' +
        'if(!b)return;' +
        'b.onclick=function(){' +
        'var el=document.querySelector(".erp-doc");' +
        'if(!el||!window.html2pdf)return;' +
        'html2pdf().set({' +
        'margin:0,' +
        'filename:"delivery-"+String(oid)+".pdf",' +
        'image:{type:"jpeg",quality:1},' +
        'html2canvas:{scale:2,useCORS:true},' +
        'jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},' +
        'pagebreak:{mode:["css","legacy"]}' +
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
        '<div class="erp-doc" style="' + logoStyle.replace(/"/g, '&quot;') + '">' +
        erpPage(false) +
        erpPage(true) +
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
