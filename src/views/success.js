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
    var orders = App.Orders.getAll();
    var order = orders.find(function (o) { return String(o.id) === String(orderId); }) || SuccessView._lastOrder || {};
    if (!order.items) { App.toast(t('success.orderNotFound'), 'error'); return; }
    var isEn = I18n.getLang() === 'en';
    var rows = order.items.map(function (item, i) {
      var bg = i % 2 === 0 ? '#ffffff' : '#ffe0c4';
      var basePrice  = (item.product && item.product.price) ? item.product.price : item.unitPrice;
      var origTotal  = App.fmtP(basePrice * item.qty);
      var finalTotal = App.fmtP(item.unitPrice * item.qty);
      return '<tr style="background:' + bg + '">' +
        '<td>' + App.escHTML(item.product.sku) + '</td>' +
        '<td style="text-align:' + (isEn ? 'left' : 'right') + '">' + App.escHTML(pLang(item.product, 'name')) + '</td>' +
        '<td>₪' + App.fmtP(item.unitPrice) + '</td>' +
        '<td>' + item.qty + '</td>' +
        '<td>₪' + origTotal + '</td>' +
        '<td>' + App.fmtP(item.discountPct) + '%</td>' +
        '<td>₪' + finalTotal + '</td></tr>';
    }).join('');

    var dir = isEn ? 'ltr' : 'rtl';
    var locale = isEn ? 'en-US' : 'he-IL';
    var win = window.open('', '_blank', 'width=800,height=700');
    if (!win) { App.toast(t('success.popupBlocked'), 'error'); return; }
    win.document.write(
      '<!DOCTYPE html><html dir="' + dir + '"><head><meta charset="UTF-8">' +
      '<title>' + t('success.deliveryNote') + ' ORD-' + order.id + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">' +
      '<style>' +
      'body{font-family:Assistant,sans-serif;direction:' + dir + ';margin:20px;color:#000}' +
      'h2{text-align:center;color:#c25200;margin-bottom:4px;font-size:22px}' +
      '.sub{text-align:center;font-size:13px;color:#555;margin-bottom:16px}' +
      '.info{display:flex;justify-content:space-between;font-size:13px;margin-bottom:12px;padding:8px;background:#f8f0e8;border-radius:6px}' +
      'table{width:100%;border-collapse:collapse;font-size:13px}' +
      'th{background:#c25200;color:#fff;padding:9px 8px;text-align:center;font-weight:800}' +
      'td{padding:8px;text-align:center;font-weight:700;border:1px solid #e0c8b8}' +
      '.totals{margin-top:16px;text-align:' + (isEn ? 'right' : 'left') + ';font-size:14px}' +
      '.totals td{border:none;padding:4px 8px}' +
      '.grand{font-size:17px;color:#c25200}' +
      '@media print{button{display:none}}' +
      '</style></head><body>' +
      '<h2>' + t('success.companyName') + '</h2>' +
      '<p class="sub">' + t('success.deliveryNote') + '</p>' +
      '<div class="info">' +
        '<span><strong>' + t('success.customer') + '</strong> ' + App.escHTML(App.orderCustomerDisplay(order)) + '</span>' +
        '<span><strong>' + t('success.orderNumber') + '</strong> ORD-' + order.id + '</span>' +
        '<span><strong>' + t('success.dateLabel') + '</strong> ' + new Date(order.timestamp).toLocaleDateString(locale) + '</span>' +
      '</div>' +
      '<table><thead><tr>' +
        '<th>' + t('common.sku') + '</th><th>' + t('success.productName') + '</th><th>' + t('success.unitPrice') + '</th><th>' + t('common.qty') + '</th><th>' + t('success.totalCol') + '</th><th>' + t('success.discountCol') + '</th><th>' + t('success.totalPayCol') + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<table class="totals"><tbody>' +
        '<tr><td>' + t('success.subtotalLabel') + '</td><td>₪' + order.subtotal + '</td></tr>' +
        '<tr><td>' + t('success.vatLabel') + '</td><td>₪' + order.vat + '</td></tr>' +
        '<tr class="grand"><td><strong>' + t('success.grandTotal') + '</strong></td><td><strong>₪' + order.total + '</strong></td></tr>' +
      '</tbody></table>' +
      '<script>setTimeout(function(){window.print();},400);<\/script>' +
      '</body></html>'
    );
    win.document.close();
  },

  _lastOrder: null
};
