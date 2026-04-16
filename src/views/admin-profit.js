/* =============================================================
   AdminProfit — Profit by product (purchase vs sale price)
   ============================================================= */
var AdminProfit = {
  render: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';

    var load = window.DB ? window.DB.collection('productCosts').get() : Promise.resolve({ docs: [] });

    load.then(function (snap) {
      var costs = {};
      snap.docs.forEach(function (d) { costs[d.id] = d.data(); });
      AdminProfit._renderTable(c, costs);
    }).catch(function () {
      AdminProfit._renderTable(c, {});
    });
  },

  _renderTable: function (c, costs) {
    var vatRate = App.state.settings.vatRate || 0.18;
    var vatDiv  = 1 + vatRate;

    var rows = PRODUCTS.filter(function (p) { return p.category !== 'shipping'; }).map(function (p) {
      var cd  = costs[p.id];
      var cost = cd ? cd.cost : null;

      var salePre  = p.price;
      var salePost = parseFloat((p.price * vatDiv).toFixed(2));

      var marginPost = cost !== null ? parseFloat((salePost - cost).toFixed(2)) : null;
      var marginPre  = cost !== null ? parseFloat((salePre  - cost).toFixed(2)) : null;
      var marginPct  = (cost !== null && salePre > 0)
        ? parseFloat(((salePre - cost) / salePre * 100).toFixed(2)) : null;

      var col = marginPost !== null
        ? (marginPost > 0 ? '#22c55e' : '#ef4444')
        : 'var(--text-muted)';

      return '<tr>' +
        '<td><code>' + p.sku + '</code></td>' +
        '<td>' + p.icon + ' ' + p.name + '</td>' +
        '<td>₪' + salePost + '</td>' +
        '<td>₪' + salePre + '</td>' +
        '<td>' + (cost !== null ? '₪' + cost : '<span style="color:var(--text-muted)">' + t('admin.notDefined') + '</span>') + '</td>' +
        '<td style="color:' + col + ';font-weight:700">' + (marginPost !== null ? '₪' + marginPost : '—') + '</td>' +
        '<td style="color:' + col + ';font-weight:700">' + (marginPre  !== null ? '₪' + marginPre  : '—') + '</td>' +
        '<td style="color:' + col + '">' + (marginPct  !== null ? marginPct + '%'              : '—') + '</td>' +
        '<td style="color:var(--text-muted);font-size:12px">' + (cd ? cd.supplierName : '—') + '</td>' +
      '</tr>';
    }).join('');

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header">' +
        '<h2>' + t('admin.profitTitle') + '</h2>' +
        '<span style="font-size:13px;color:var(--text-muted)">' + t('admin.profitSubtitle') + '</span>' +
      '</div>' +
      '<p class="admin-note">' + t('admin.profitNote') + '</p>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr>' +
          '<th>' + t('common.sku') + '</th><th>' + t('admin.product') + '</th>' +
          '<th>' + t('admin.priceWithVat') + '</th><th>' + t('admin.priceBeforeVatCol') + '</th>' +
          '<th>' + t('admin.supplierCost') + '</th>' +
          '<th>' + t('admin.profitWithVat') + '</th><th>' + t('admin.profitBeforeVat') + '</th>' +
          '<th>' + t('admin.profitPct') + '</th><th>' + t('admin.supplierCol') + '</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  }
};
