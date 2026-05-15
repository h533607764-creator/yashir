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
    function cssSafeUrl(u) {
      return String(u || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }
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
      return '<span class="ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';
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

      var docDate = (function () {
        var ms = typeof AdminView !== 'undefined' && AdminView._orderTimestampMs ? AdminView._orderTimestampMs(order) : 0;
        if (!ms && order.timestamp) {
          var d0 = new Date(order.timestamp);
          ms = isNaN(d0.getTime()) ? 0 : d0.getTime();
        }
        return ms ? new Date(ms).toLocaleDateString(locale) : '—';
      })();

      var cu = lookupCustomer(order);
      var shipAddr = cu && (cu.shippingAddress || cu.address) ? String(cu.shippingAddress || cu.address) : '';
      if (!shipAddr.trim()) shipAddr = '—';
      var contactNm = cu && cu.contactPerson ? String(cu.contactPerson) : '';
      var contactPh = (cu && cu.phone) || order.customerPhone || '';
      var contactLine = (contactNm || contactPh)
        ? App.escHTML((contactNm + (contactNm && contactPh ? ' · ' : '') + contactPh).trim())
        : '<span class="ph">' + App.escHTML(t('success.bizPlaceholder')) + '</span>';

      var subtotal = parseFloat(order.subtotal) || 0;
      var savings = parseFloat(order.savings) || 0;
      var vat = parseFloat(order.vat) || 0;
      var total = parseFloat(order.total) || 0;
      var grossSum = parseFloat((subtotal + savings).toFixed(2));

      var heroLogo = resolveLogoSrc();
      var wmUrl = cssSafeUrl(heroLogo);

      var rows = order.items.map(function (item, i) {
        var listUnit = (item.product && typeof item.product.price === 'number' && !isNaN(item.product.price))
          ? item.product.price
          : item.unitPrice;
        var q = parseInt(item.qty, 10);
        if (isNaN(q) || q < 1) q = 1;
        var lineList = parseFloat((listUnit * q).toFixed(2));
        var lineFinal = parseFloat((item.unitPrice * q).toFixed(2));
        var z = i % 2 === 0 ? 'z0' : 'z1';
        return '<tr class="' + z + '">' +
          '<td>' + App.escHTML(item.product && item.product.sku != null ? item.product.sku : '') + '</td>' +
          '<td class="tl">' + App.escHTML(pLang(item.product, 'name')) + '</td>' +
          '<td class="num">' + q + '</td>' +
          '<td class="num">₪' + App.fmtP(listUnit) + '</td>' +
          '<td class="num">₪' + App.fmtP(lineList) + '</td>' +
          '<td class="num">' + App.fmtP(item.discountPct || 0) + '%</td>' +
          '<td class="num">₪' + App.fmtP(lineFinal) + '</td>' +
        '</tr>';
      }).join('');

      var win = window.open('', '_blank', 'width=900,height=800');
      if (!win) { App.toast(t('success.popupBlocked'), 'error'); return; }

      win.document.write(
        '<!DOCTYPE html><html dir="' + dir + '" lang="he"><head><meta charset="UTF-8">' +
        '<title>' + App.escHTML(t('success.deliveryNote')) + ' ORD-' + App.escHTML(String(order.id)) + '</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">' +
        '<style>' +
        '@page{size:A4;margin:10mm}' +
        '*{box-sizing:border-box}' +
        'body{font-family:Assistant,sans-serif;margin:0;padding:0;color:#111;background:#fff;direction:rtl;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
        '.print-root{position:relative;min-height:100vh}' +
        '.print-root::before{content:"";position:fixed;left:0;right:0;top:0;bottom:0;z-index:0;pointer-events:none;' +
        'background:url("' + wmUrl + '") center center/65% auto no-repeat;opacity:.06}' +
        '.sheet{position:relative;z-index:1;padding:8px 6px 24px;max-width:100%;overflow:hidden}' +
        '.bsd{position:absolute;top:0;right:0;font-size:11px;color:#333;font-weight:600}' +
        '.hero{text-align:center;margin:18px 0 12px}' +
        '.hero img{max-width:min(280px,55vw);max-height:120px;object-fit:contain;display:block;margin:0 auto 8px}' +
        '.brand{font-size:20px;font-weight:800;color:#c25200;margin:0 0 4px}' +
        '.biz{font-size:12px;line-height:1.45;color:#333;text-align:center;margin:0 0 8px}' +
        '.biz .ph{color:#c25200;font-weight:600}' +
        '.doc-title{font-size:19px;font-weight:800;text-align:center;margin:12px 0 4px;color:#111}' +
        '.doc-meta{font-size:13px;text-align:center;color:#444;margin-bottom:14px}' +
        '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}' +
        '@media(max-width:520px){.grid2{grid-template-columns:1fr}}' +
        '.blk{border:1px solid #c8c8c8;border-radius:8px;padding:10px 12px;background:rgba(255,255,255,.92)}' +
        '.blk h3{margin:0 0 8px;font-size:14px;font-weight:800;color:#c25200}' +
        '.blk .r{font-size:12px;margin:4px 0;display:flex;gap:6px;justify-content:space-between;flex-wrap:wrap}' +
        '.blk .k{font-weight:700;color:#444}' +
        '.blk .v{text-align:left;flex:1;min-width:120px;font-weight:600}' +
        '.items{margin:6px 0 14px}' +
        'table.items{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;word-wrap:break-word}' +
        'table.items th,table.items td{border:1px solid #999;padding:6px 5px;vertical-align:top}' +
        'table.items th{background:#f2f4f8;font-weight:800;font-size:10px}' +
        'table.items tbody tr{page-break-inside:avoid}' +
        'table.items tr.z1{background:#faf6f2}' +
        'table.items td.num,table.items th.num{text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap}' +
        'table.items td.tl,table.items th.tl{text-align:right}' +
        '.sum{width:100%;max-width:360px;margin:12px 0 0 auto;border-collapse:collapse;font-size:13px}' +
        '.sum td{border:none;padding:5px 8px}' +
        '.sum td.lbl{font-weight:700}' +
        '.sum td.amt{text-align:left;font-variant-numeric:tabular-nums}' +
        '.sum tr.pay td{font-size:16px;font-weight:800;border-top:2px solid #c25200;padding-top:10px;color:#c25200}' +
        '.sign{margin-top:28px;padding-top:12px;border-top:1px solid #ccc;font-size:13px;font-weight:700}' +
        '.sign .ln{margin-top:16px;border-bottom:1px solid #333;height:1px;width:70%;max-width:340px}' +
        '.ph{color:#c25200;font-weight:600;font-style:italic}' +
        '</style></head><body>' +
        '<div class="print-root"><div class="sheet">' +
        '<div class="bsd">' + App.escHTML(t('success.bsd')) + '</div>' +
        '<div class="hero">' +
          '<img src="' + App.escHTML(heroLogo) + '" alt="" crossorigin="anonymous" onerror="this.src=\'/logo.png\'">' +
          '<p class="brand">' + App.escHTML(t('success.companyName')) + '</p>' +
          '<div class="biz">' +
            bizLineHtml(st.businessAddress) + ' · ' +
            bizLineHtml(st.businessPhone) + ' · ' +
            bizLineHtml(st.businessEmail) +
          '</div>' +
        '</div>' +
        '<div class="doc-title">' + App.escHTML(t('success.deliveryNoteNumbered')) + ' ORD-' + App.escHTML(String(order.id)) + '</div>' +
        '<div class="doc-meta"><strong>' + App.escHTML(t('success.dateLabel')) + '</strong> ' + App.escHTML(docDate) + '</div>' +
        '<div class="grid2">' +
          '<div class="blk">' +
            '<h3>' + App.escHTML(t('success.clientSection')) + '</h3>' +
            '<div class="r"><span class="k">' + App.escHTML(t('admin.nameCol')) + '</span><span class="v">' + App.escHTML(App.orderCustomerDisplay(order)) + '</span></div>' +
            '<div class="r"><span class="k">' + App.escHTML(t('success.bizIdShort')) + '</span><span class="v">' + App.escHTML(order.customerId != null ? String(order.customerId) : '—') + '</span></div>' +
            '<div class="r"><span class="k">' + App.escHTML(t('common.phone')) + '</span><span class="v">' + App.escHTML(order.customerPhone || '—') + '</span></div>' +
            '<div class="r"><span class="k">' + App.escHTML(t('common.email')) + '</span><span class="v">' + App.escHTML(order.customerEmail || '—') + '</span></div>' +
          '</div>' +
          '<div class="blk">' +
            '<h3>' + App.escHTML(t('success.shipSection')) + '</h3>' +
            '<div class="r"><span class="k">' + App.escHTML(t('success.shipAddressLabel')) + '</span><span class="v">' + App.escHTML(shipAddr) + '</span></div>' +
            '<div class="r"><span class="k">' + App.escHTML(t('success.contactAndPhone')) + '</span><span class="v">' + contactLine + '</span></div>' +
          '</div>' +
        '</div>' +
        '<table class="items"><thead><tr>' +
          '<th>' + App.escHTML(t('success.colSku')) + '</th>' +
          '<th class="tl">' + App.escHTML(t('success.productName')) + '</th>' +
          '<th class="num">' + App.escHTML(t('success.colQty')) + '</th>' +
          '<th class="num">' + App.escHTML(t('success.unitPrice')) + '</th>' +
          '<th class="num">' + App.escHTML(t('success.colLineGross')) + '</th>' +
          '<th class="num">' + App.escHTML(t('success.colDiscPct')) + '</th>' +
          '<th class="num">' + App.escHTML(t('success.colLineNet')) + '</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
        '<table class="sum"><tbody>' +
          '<tr><td class="lbl">' + App.escHTML(t('success.grossTotal')) + '</td><td class="amt">₪' + App.fmtP(grossSum) + '</td></tr>' +
          '<tr><td class="lbl">' + App.escHTML(t('success.totalDiscount')) + '</td><td class="amt">₪' + App.fmtP(savings) + '</td></tr>' +
          '<tr><td class="lbl">' + App.escHTML(t('success.preVatTotal')) + '</td><td class="amt">₪' + App.fmtP(subtotal) + '</td></tr>' +
          '<tr><td class="lbl">' + App.escHTML(vatLine) + '</td><td class="amt">₪' + App.fmtP(vat) + '</td></tr>' +
          '<tr class="pay"><td class="lbl">' + App.escHTML(t('success.grandTotal')) + '</td><td class="amt">₪' + App.fmtP(total) + '</td></tr>' +
        '</tbody></table>' +
        '<div class="sign">' + App.escHTML(t('success.signatureRecipient')) + '<div class="ln"></div></div>' +
        '</div></div>' +
        '<script>setTimeout(function(){window.print();},400);<\/script>' +
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
