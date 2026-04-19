/* =============================================================
   AdminFinancial — Financial management
   ============================================================= */
var AdminFinancial = {
  _period: 'month',
  _orders: [],
  _transactions: [],

  render: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';

    var ordLim = (typeof AdminView !== 'undefined' && AdminView._ORDERS_QUERY_LIMIT) ? AdminView._ORDERS_QUERY_LIMIT : 50;
    var loadO = window.DB
      ? window.DB.collection('orders').orderBy('timestamp', 'desc').limit(ordLim).get()
      : Promise.resolve({ docs: [] });
    var loadT = window.DB ? window.DB.collection('transactions').get() : Promise.resolve({ docs: [] });

    Promise.all([loadO, loadT]).then(function (res) {
      AdminFinancial._orders = res[0].docs.map(function (d) { return d.data(); });
      AdminFinancial._transactions = res[1].docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
      AdminFinancial._renderPanel(c);
    }).catch(function () {
      AdminFinancial._orders = App.Orders.getAll();
      AdminFinancial._transactions = [];
      AdminFinancial._renderPanel(c);
    });
  },

  _renderPanel: function (c) {
    var periods = [
      { id: 'month',    label: t('admin.periodMonth') },
      { id: 'quarter',  label: t('admin.periodQuarter') },
      { id: 'halfyear', label: t('admin.periodHalfYear') },
      { id: 'year',     label: t('admin.periodYear') },
      { id: 'all',      label: t('admin.periodAll') }
    ];
    var vatRate = App.state.settings.vatRate || 0.18;
    var filtered = AdminFinancial._filter(AdminFinancial._period);
    var sum = AdminFinancial._calc(filtered, vatRate);

    var txRows = filtered.transactions.map(function (tx) {
      var isIn = tx.type === 'income';
      return '<tr>' +
        '<td>' + tx.date + '</td>' +
        '<td><span style="color:' + (isIn ? '#22c55e' : '#ef4444') + ';font-weight:700">' + (isIn ? t('admin.incomeType') : t('admin.expenseType')) + '</span></td>' +
        '<td>' + tx.description + '</td>' +
        '<td style="color:var(--text-muted)">' + (tx.category || '—') + '</td>' +
        '<td>₪' + tx.amountPreVat + '</td>' +
        '<td>₪' + tx.amountPostVat + '</td>' +
        '<td style="display:flex;gap:4px;padding:8px">' +
          '<button class="btn-sm danger" onclick="AdminFinancial._deleteTx(\'' + tx._id + '\')"><span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted)">' + t('admin.noRecordsInPeriod') + '</td></tr>';

    var profColor = sum.netPost >= 0 ? '#22c55e' : '#ef4444';

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>' + t('admin.financialTitle') + '</h2>' +
        '<button class="btn-primary" onclick="AdminFinancial._addTx()">' +
          '<span class="material-icons-round">add</span> ' + t('admin.addIncomeExpense') + '</button>' +
      '</div>' +

      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">' +
        periods.map(function (p) {
          return '<button class="cat-btn' + (AdminFinancial._period === p.id ? ' active' : '') +
            '" onclick="AdminFinancial._setPeriod(\'' + p.id + '\')">' + p.label + '</button>';
        }).join('') +
      '</div>' +

      '<div class="settings-grid" style="margin-bottom:24px">' +
        AdminFinancial._card(t('admin.salesRevenue'), '₪' + sum.revenuePost, '₪' + sum.revenuePre + ' ' + t('admin.beforeVatLabel'), 'var(--blue)') +
        AdminFinancial._card(t('admin.expenses'), '₪' + sum.expensesPost, '₪' + sum.expensesPre + ' ' + t('admin.beforeVatLabel'), '#ef4444') +
        AdminFinancial._card(t('admin.manualIncome'), '₪' + sum.incomePost, '₪' + sum.incomePre + ' ' + t('admin.beforeVatLabel'), '#8b5cf6') +
      '</div>' +

      '<div style="background:var(--navy-light);border-radius:var(--radius);padding:16px;margin-bottom:24px;border:1.5px solid var(--border)">' +
        '<h3 style="margin-bottom:12px;font-size:14px;color:var(--text-muted)">' + t('admin.profitSummary') + '</h3>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
          '<thead><tr><th style="text-align:' + (I18n.getLang() === 'en' ? 'left' : 'right') + ';padding:6px 0;color:var(--text-muted);font-weight:500"></th>' +
            '<th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">' + t('admin.beforeVatLabel') + '</th>' +
            '<th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">' + t('admin.afterVatLabel') + '</th>' +
          '</tr></thead>' +
          '<tbody>' +
            AdminFinancial._summaryRow(t('admin.salesProfit'), sum.saleNetPre, sum.saleNetPost) +
            AdminFinancial._summaryRow(t('admin.manualProfit'), sum.manualNetPre, sum.manualNetPost) +
            '<tr style="border-top:2px solid var(--border)">' +
              '<td style="padding:8px 0;font-weight:800;font-size:15px">' + t('admin.netProfit') + '</td>' +
              '<td style="padding:8px;color:' + profColor + ';font-weight:800;font-size:16px">₪' + sum.netPre + '</td>' +
              '<td style="padding:8px;color:' + profColor + ';font-weight:800;font-size:16px">₪' + sum.netPost + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<h3 style="margin-bottom:12px;font-size:14px">' + t('admin.manualTransactions') + '</h3>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>' + t('common.date') + '</th><th>' + t('admin.typeCol') + '</th><th>' + t('common.description') + '</th><th>' + t('admin.categoryColFin') + '</th><th>' + t('admin.beforeVatCol') + '</th><th>' + t('admin.afterVatCol') + '</th><th>' + t('admin.deleteCol') + '</th></tr></thead>' +
        '<tbody>' + txRows + '</tbody>' +
      '</table></div></div>';
  },

  _card: function (title, main, sub, color) {
    return '<div style="background:var(--navy-light);border-radius:var(--radius);padding:16px;border-right:3px solid ' + color + '">' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">' + title + '</div>' +
      '<div style="font-size:22px;font-weight:800;color:' + color + '">' + main + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + sub + '</div>' +
    '</div>';
  },

  _summaryRow: function (label, pre, post) {
    var col = post >= 0 ? '#22c55e' : '#ef4444';
    return '<tr><td style="padding:6px 0;color:var(--text-muted)">' + label + '</td>' +
      '<td style="padding:6px 8px;color:' + col + ';font-weight:700">₪' + pre + '</td>' +
      '<td style="padding:6px 8px;color:' + col + ';font-weight:700">₪' + post + '</td></tr>';
  },

  _setPeriod: function (period) {
    AdminFinancial._period = period;
    AdminFinancial._renderPanel(document.getElementById('av-content'));
  },

  _filter: function (period) {
    var now   = new Date();
    var start = null;
    if (period === 'month')    { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    if (period === 'quarter')  { start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); }
    if (period === 'halfyear') { start = new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1); }
    if (period === 'year')     { start = new Date(now.getFullYear(), 0, 1); }

    var fO = start
      ? AdminFinancial._orders.filter(function (o) {
          var ms = typeof AdminView !== 'undefined' && AdminView._orderTimestampMs ? AdminView._orderTimestampMs(o) : 0;
          if (!ms) return false;
          return new Date(ms) >= start;
        })
      : AdminFinancial._orders;
    var fT = start
      ? AdminFinancial._transactions.filter(function (tx) { return new Date(tx.date) >= start; })
      : AdminFinancial._transactions;

    return { orders: fO, transactions: fT };
  },

  _calc: function (filtered, vatRate) {
    var div = 1 + vatRate;

    var revenuePost = parseFloat(filtered.orders.reduce(function (s, o) { return s + (o.total || 0); }, 0).toFixed(2));
    var revenuePre  = parseFloat((revenuePost / div).toFixed(2));

    var expensesPre = 0, expensesPost = 0, incomePre = 0, incomePost = 0;
    filtered.transactions.forEach(function (tx) {
      if (tx.type === 'expense') {
        expensesPre  += parseFloat(tx.amountPreVat  || 0);
        expensesPost += parseFloat(tx.amountPostVat || 0);
      } else {
        incomePre  += parseFloat(tx.amountPreVat  || 0);
        incomePost += parseFloat(tx.amountPostVat || 0);
      }
    });
    expensesPre  = parseFloat(expensesPre.toFixed(2));
    expensesPost = parseFloat(expensesPost.toFixed(2));
    incomePre    = parseFloat(incomePre.toFixed(2));
    incomePost   = parseFloat(incomePost.toFixed(2));

    var saleNetPre   = parseFloat((revenuePre  - expensesPre).toFixed(2));
    var saleNetPost  = parseFloat((revenuePost - expensesPost).toFixed(2));
    var manualNetPre = parseFloat((incomePre   - 0).toFixed(2));
    var manualNetPost= parseFloat((incomePost  - 0).toFixed(2));
    var netPre       = parseFloat((saleNetPre  + incomePre).toFixed(2));
    var netPost      = parseFloat((saleNetPost + incomePost).toFixed(2));

    return { revenuePost: revenuePost, revenuePre: revenuePre, expensesPost: expensesPost, expensesPre: expensesPre, incomePost: incomePost, incomePre: incomePre,
             saleNetPre: saleNetPre, saleNetPost: saleNetPost, manualNetPre: manualNetPre, manualNetPost: manualNetPost, netPre: netPre, netPost: netPost };
  },

  _addTx: function () {
    AdminFinancial._showTxModal(null);
  },

  _showTxModal: function (tx) {
    var isNew = !tx;
    tx = tx || { type: 'expense', description: '', amount: '', vatIncluded: true, date: new Date().toISOString().substring(0, 10), category: '' };
    App.showModal(
      '<h3>' + (isNew ? t('admin.addIncomeExpense') : t('common.edit')) + '</h3>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>' + t('admin.typeCol') + '</label>' +
          '<select id="tf-type" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
            '<option value="expense"' + (tx.type === 'expense' ? ' selected' : '') + '>' + t('admin.expense') + '</option>' +
            '<option value="income"' + (tx.type === 'income'  ? ' selected' : '') + '>' + t('admin.extraIncome') + '</option>' +
          '</select></div>' +
        '<div class="form-group"><label>' + t('common.description') + '</label><input type="text" id="tf-desc" value="' + (tx.description || '') + '"></div>' +
        '<div class="form-group"><label>' + t('admin.categoryColFin') + '</label><input type="text" id="tf-cat" value="' + (tx.category || '') + '" placeholder="' + t('admin.catPlaceholder') + '"></div>' +
        '<div class="form-group"><label>' + t('common.date') + '</label><input type="date" id="tf-date" value="' + tx.date + '"></div>' +
        '<div class="form-group"><label>' + t('admin.amount') + '</label><input type="number" id="tf-amount" value="' + (tx.amount || '') + '" min="0" step="0.01"></div>' +
        '<div class="form-group"><label>' + t('admin.amountEnteredAs') + '</label>' +
          '<select id="tf-vat" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
            '<option value="true"'  + (tx.vatIncluded  ? ' selected' : '') + '>' + t('admin.withVatOption') + '</option>' +
            '<option value="false"' + (!tx.vatIncluded ? ' selected' : '') + '>' + t('admin.withoutVatOption') + '</option>' +
          '</select></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminFinancial._saveTx(\'' + (tx._id || '') + '\')">' +
            '<span class="material-icons-round">save</span> ' + t('common.save') + '</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">' + t('common.cancel') + '</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveTx: function (id) {
    if (!window.DB) { App.toast(t('admin.firestoreNotConnected'), 'error'); return; }
    var amount = parseFloat(document.getElementById('tf-amount').value);
    var desc   = document.getElementById('tf-desc').value.trim();
    if (!desc || isNaN(amount)) { App.toast(t('admin.descAmountRequired'), 'warning'); return; }

    var vatIncluded = document.getElementById('tf-vat').value === 'true';
    var vatRate = App.state.settings.vatRate || 0.18;
    var vatMult = 1 + vatRate;
    var amountPreVat  = vatIncluded ? parseFloat((amount / vatMult).toFixed(2)) : parseFloat(amount.toFixed(2));
    var amountPostVat = vatIncluded ? parseFloat(amount.toFixed(2))             : parseFloat((amount * vatMult).toFixed(2));

    var data = {
      type:          document.getElementById('tf-type').value,
      description:   desc,
      category:      document.getElementById('tf-cat').value,
      date:          document.getElementById('tf-date').value,
      amount:        amount,
      vatIncluded:   vatIncluded,
      amountPreVat:  amountPreVat,
      amountPostVat: amountPostVat
    };

    var ref = id ? window.DB.collection('transactions').doc(id) : window.DB.collection('transactions').doc();
    ref.set(data).then(function () {
      App.toast(t('admin.savedSuccess'), 'success');
      App.closeModal();
      AdminFinancial.render(document.getElementById('av-content'));
    }).catch(function () { App.toast(t('admin.saveError'), 'error'); });
  },

  _deleteTx: function (id) {
    if (!confirm(t('admin.deleteRecordConfirm'))) return;
    window.DB.collection('transactions').doc(id).delete().then(function () {
      App.toast(t('admin.deleted'), 'success');
      AdminFinancial.render(document.getElementById('av-content'));
    });
  }
};
