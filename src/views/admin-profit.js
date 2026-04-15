/* =============================================================
   AdminProfit — רווח לפי מוצרים (מחיר קנייה מול מכירה)
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

      var salePre  = parseFloat((p.price / vatDiv).toFixed(2));
      var salePost = p.price;

      var marginPost = cost !== null ? parseFloat((salePost - cost).toFixed(2)) : null;
      var marginPre  = cost !== null ? parseFloat((salePre  - cost).toFixed(2)) : null;
      var marginPct  = (cost !== null && salePost > 0)
        ? parseFloat(((salePost - cost) / salePost * 100).toFixed(2)) : null;

      var col = marginPost !== null
        ? (marginPost > 0 ? '#22c55e' : '#ef4444')
        : 'var(--text-muted)';

      return '<tr>' +
        '<td><code>' + p.sku + '</code></td>' +
        '<td>' + p.icon + ' ' + p.name + '</td>' +
        '<td>₪' + salePost + '</td>' +
        '<td>₪' + salePre + '</td>' +
        '<td>' + (cost !== null ? '₪' + cost : '<span style="color:var(--text-muted)">לא הוגדר</span>') + '</td>' +
        '<td style="color:' + col + ';font-weight:700">' + (marginPost !== null ? '₪' + marginPost : '—') + '</td>' +
        '<td style="color:' + col + ';font-weight:700">' + (marginPre  !== null ? '₪' + marginPre  : '—') + '</td>' +
        '<td style="color:' + col + '">' + (marginPct  !== null ? marginPct + '%'              : '—') + '</td>' +
        '<td style="color:var(--text-muted);font-size:12px">' + (cd ? cd.supplierName : '—') + '</td>' +
      '</tr>';
    }).join('');

    var totalSale = PRODUCTS.filter(function (p) { return p.category !== 'shipping'; })
      .reduce(function (s, p) { return s + p.price; }, 0);
    var totalCost = PRODUCTS.filter(function (p) { return p.category !== 'shipping'; })
      .filter(function (p) { return costs[p.id]; })
      .reduce(function (s, p) { return s + costs[p.id].cost; }, 0);

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header">' +
        '<h2>רווח לפי מוצרים</h2>' +
        '<span style="font-size:13px;color:var(--text-muted)">מחיר מכירה מול עלות ספק</span>' +
      '</div>' +
      '<p class="admin-note">לעדכון עלויות ספק — עבור ללשונית "ספקים" ↑</p>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr>' +
          '<th>מק"ט</th><th>מוצר</th>' +
          '<th>מחיר (כולל מע"מ)</th><th>מחיר (לפני מע"מ)</th>' +
          '<th>עלות ספק</th>' +
          '<th>רווח (כולל מע"מ)</th><th>רווח (לפני מע"מ)</th>' +
          '<th>% רווח</th><th>ספק</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div></div>';
  }
};
