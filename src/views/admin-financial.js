/* =============================================================
   AdminFinancial — ניהול פיננסי מורחב
   תקופות, הכנסות/הוצאות לפני ואחרי מע"מ, שורות רווח
   ============================================================= */
var AdminFinancial = {
  _period: 'month',
  _orders: [],
  _transactions: [],

  render: function (c) {
    c.innerHTML = '<div style="display:flex;justify-content:center;padding:48px"><div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .8s linear infinite"></div></div>';

    var loadO = window.DB ? window.DB.collection('orders').get() : Promise.resolve({ docs: [] });
    var loadT = window.DB ? window.DB.collection('transactions').get() : Promise.resolve({ docs: [] });

    Promise.all([loadO, loadT]).then(function (res) {
      AdminFinancial._orders = res[0].docs.map(function (d) { return d.data(); });
      AdminFinancial._transactions = res[1].docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
      AdminFinancial._renderPanel(c);
    }).catch(function () {
      // Fallback to localStorage orders + empty transactions
      AdminFinancial._orders = App.Orders.getAll();
      AdminFinancial._transactions = [];
      AdminFinancial._renderPanel(c);
    });
  },

  _renderPanel: function (c) {
    var periods = [
      { id: 'month',    label: 'חודש נוכחי' },
      { id: 'quarter',  label: 'רבעון' },
      { id: 'halfyear', label: 'חצי שנה' },
      { id: 'year',     label: 'שנה נוכחית' },
      { id: 'all',      label: 'מתחילת העסק' }
    ];
    var vatRate = App.state.settings.vatRate || 0.18;
    var filtered = AdminFinancial._filter(AdminFinancial._period);
    var sum = AdminFinancial._calc(filtered, vatRate);

    var txRows = filtered.transactions.map(function (tx) {
      var isIn = tx.type === 'income';
      return '<tr>' +
        '<td>' + tx.date + '</td>' +
        '<td><span style="color:' + (isIn ? '#22c55e' : '#ef4444') + ';font-weight:700">' + (isIn ? '▲ הכנסה' : '▼ הוצאה') + '</span></td>' +
        '<td>' + tx.description + '</td>' +
        '<td style="color:var(--text-muted)">' + (tx.category || '—') + '</td>' +
        '<td>₪' + tx.amountPreVat + '</td>' +
        '<td>₪' + tx.amountPostVat + '</td>' +
        '<td style="display:flex;gap:4px;padding:8px">' +
          '<button class="btn-sm danger" onclick="AdminFinancial._deleteTx(\'' + tx._id + '\')"><span class="material-icons-round">delete</span></button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted)">אין רשומות בתקופה זו</td></tr>';

    var profColor = sum.netPost >= 0 ? '#22c55e' : '#ef4444';

    c.innerHTML = '<div class="admin-section">' +
      '<div class="admin-section-header"><h2>ניהול פיננסי</h2>' +
        '<button class="btn-primary" onclick="AdminFinancial._addTx()">' +
          '<span class="material-icons-round">add</span> הוסף הכנסה / הוצאה</button>' +
      '</div>' +

      /* תקופות */
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">' +
        periods.map(function (p) {
          return '<button class="cat-btn' + (AdminFinancial._period === p.id ? ' active' : '') +
            '" onclick="AdminFinancial._setPeriod(\'' + p.id + '\')">' + p.label + '</button>';
        }).join('') +
      '</div>' +

      /* כרטיסי סיכום */
      '<div class="settings-grid" style="margin-bottom:24px">' +
        AdminFinancial._card('הכנסות ממכירות', '₪' + sum.revenuePost, '₪' + sum.revenuePre + ' לפני מע"מ', 'var(--blue)') +
        AdminFinancial._card('הוצאות נלוות', '₪' + sum.expensesPost, '₪' + sum.expensesPre + ' לפני מע"מ', '#ef4444') +
        AdminFinancial._card('הכנסות ידניות נוספות', '₪' + sum.incomePost, '₪' + sum.incomePre + ' לפני מע"מ', '#8b5cf6') +
      '</div>' +

      /* שורות רווח */
      '<div style="background:var(--navy-light);border-radius:var(--radius);padding:16px;margin-bottom:24px;border:1.5px solid var(--border)">' +
        '<h3 style="margin-bottom:12px;font-size:14px;color:var(--text-muted)">סיכום רווחיות</h3>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
          '<thead><tr><th style="text-align:right;padding:6px 0;color:var(--text-muted);font-weight:500"></th>' +
            '<th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">לפני מע"מ</th>' +
            '<th style="text-align:left;padding:6px 8px;color:var(--text-muted);font-weight:500">אחרי מע"מ</th>' +
          '</tr></thead>' +
          '<tbody>' +
            AdminFinancial._summaryRow('רווח ממכירות (הכנסות פחות הוצאות)', sum.saleNetPre, sum.saleNetPost) +
            AdminFinancial._summaryRow('רווח/הפסד — הכנסות והוצאות ידניות', sum.manualNetPre, sum.manualNetPost) +
            '<tr style="border-top:2px solid var(--border)">' +
              '<td style="padding:8px 0;font-weight:800;font-size:15px">סה"כ רווח נקי</td>' +
              '<td style="padding:8px;color:' + profColor + ';font-weight:800;font-size:16px">₪' + sum.netPre + '</td>' +
              '<td style="padding:8px;color:' + profColor + ';font-weight:800;font-size:16px">₪' + sum.netPost + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +

      /* טבלת עסקאות */
      '<h3 style="margin-bottom:12px;font-size:14px">הכנסות / הוצאות ידניות</h3>' +
      '<div class="table-wrap"><table class="admin-table">' +
        '<thead><tr><th>תאריך</th><th>סוג</th><th>תיאור</th><th>קטגוריה</th><th>לפני מע"מ</th><th>אחרי מע"מ</th><th>מחק</th></tr></thead>' +
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
      ? AdminFinancial._orders.filter(function (o) { return new Date(o.timestamp) >= start; })
      : AdminFinancial._orders;
    var fT = start
      ? AdminFinancial._transactions.filter(function (t) { return new Date(t.date) >= start; })
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
    var manualNetPre = parseFloat((incomePre   - 0).toFixed(2));   // הכנסות ידניות בלבד
    var manualNetPost= parseFloat((incomePost  - 0).toFixed(2));
    var netPre       = parseFloat((saleNetPre  + incomePre).toFixed(2));
    var netPost      = parseFloat((saleNetPost + incomePost).toFixed(2));

    return { revenuePost, revenuePre, expensesPost, expensesPre, incomePost, incomePre,
             saleNetPre, saleNetPost, manualNetPre, manualNetPost, netPre, netPost };
  },

  _addTx: function () {
    AdminFinancial._showTxModal(null);
  },

  _showTxModal: function (tx) {
    var isNew = !tx;
    tx = tx || { type: 'expense', description: '', amount: '', vatIncluded: true, date: new Date().toISOString().substring(0, 10), category: '' };
    App.showModal(
      '<h3>' + (isNew ? 'הוסף הכנסה / הוצאה' : 'עריכה') + '</h3>' +
      '<div class="customer-form">' +
        '<div class="form-group"><label>סוג</label>' +
          '<select id="tf-type" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
            '<option value="expense"' + (tx.type === 'expense' ? ' selected' : '') + '>הוצאה</option>' +
            '<option value="income"' + (tx.type === 'income'  ? ' selected' : '') + '>הכנסה נוספת</option>' +
          '</select></div>' +
        '<div class="form-group"><label>תיאור</label><input type="text" id="tf-desc" value="' + (tx.description || '') + '"></div>' +
        '<div class="form-group"><label>קטגוריה</label><input type="text" id="tf-cat" value="' + (tx.category || '') + '" placeholder="שכירות, שיווק, ציוד..."></div>' +
        '<div class="form-group"><label>תאריך</label><input type="date" id="tf-date" value="' + tx.date + '"></div>' +
        '<div class="form-group"><label>סכום (₪)</label><input type="number" id="tf-amount" value="' + (tx.amount || '') + '" min="0" step="0.01"></div>' +
        '<div class="form-group"><label>הסכום מוזן</label>' +
          '<select id="tf-vat" style="background:var(--input-bg);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:12px 14px;font-size:15px;width:100%">' +
            '<option value="true"'  + (tx.vatIncluded  ? ' selected' : '') + '>כולל מע"מ (אחרי מע"מ)</option>' +
            '<option value="false"' + (!tx.vatIncluded ? ' selected' : '') + '>לא כולל מע"מ (לפני מע"מ)</option>' +
          '</select></div>' +
        '<div style="display:flex;gap:10px;margin-top:4px">' +
          '<button class="btn-primary" onclick="AdminFinancial._saveTx(\'' + (tx._id || '') + '\')">' +
            '<span class="material-icons-round">save</span> שמור</button>' +
          '<button class="btn-secondary" onclick="App.closeModal()">ביטול</button>' +
        '</div>' +
      '</div>'
    );
  },

  _saveTx: function (id) {
    if (!window.DB) { App.toast('Firestore לא מחובר', 'error'); return; }
    var amount = parseFloat(document.getElementById('tf-amount').value);
    var desc   = document.getElementById('tf-desc').value.trim();
    if (!desc || isNaN(amount)) { App.toast('תיאור וסכום חובה', 'warning'); return; }

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
      App.toast('נשמר בהצלחה', 'success');
      App.closeModal();
      AdminFinancial.render(document.getElementById('av-content'));
    }).catch(function () { App.toast('שגיאה בשמירה', 'error'); });
  },

  _deleteTx: function (id) {
    if (!confirm('למחוק רשומה זו?')) return;
    window.DB.collection('transactions').doc(id).delete().then(function () {
      App.toast('נמחק', 'success');
      AdminFinancial.render(document.getElementById('av-content'));
    });
  }
};
