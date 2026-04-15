var CartView = {
  renderPanel: function () {
    var panel = document.getElementById('cart-panel');
    if (!panel) return;
    var cart     = App.state.cart;
    var needsShip = App.Cart.needsShipping();
    var shipCost  = App.Cart.getShippingCost();
    var minAmt    = App.state.settings.minOrderAmount;

    var allItems = cart.slice();
    if (needsShip && cart.length > 0) {
      allItems.push({ product: Object.assign({}, SHIPPING_PRODUCT, { price: shipCost }), qty: 1, unitPrice: shipCost, discountPct: 0 });
    }
    var totals = App.Pricing.calcTotals(allItems);

    var itemsHTML = cart.length === 0
      ? '<div class="cart-empty"><span class="material-icons-round">shopping_cart</span><p>העגלה ריקה</p>' +
          '<button class="btn-primary" onclick="App.closeCart();App.navigate(\'catalog\')">לקטלוג</button></div>'
      : '<div class="cart-items">' +
          cart.map(function (item) {
            var isOOS = item.outOfStock || item.product.stock === 0;
            return '<div class="cart-item' + (isOOS ? ' cart-item-oos' : '') + '">' +
              '<div class="cart-item-icon">' + item.product.icon + '</div>' +
              '<div class="cart-item-info">' +
                '<span class="cart-item-name">' + item.product.name + '</span>' +
                '<span class="cart-item-sku">מק"ט ' + item.product.sku + '</span>' +
                (item.discountPct > 0 ? '<span class="cart-item-disc">הנחה ' + item.discountPct + '%</span>' : '') +
                (isOOS ? '<span class="cart-item-oos-note"><span class="material-icons-round" style="font-size:13px">schedule</span> חסר במלאי — עלול להתעכב</span>' : '') +
              '</div>' +
              '<div class="cart-item-qty">' +
                '<button onclick="App.Cart.updateQty(\'' + item.product.id + '\',' + (item.qty - 1) + ')">−</button>' +
                '<span>' + item.qty + '</span>' +
                '<button onclick="App.Cart.updateQty(\'' + item.product.id + '\',' + (item.qty + 1) + ')">+</button>' +
              '</div>' +
              '<div class="cart-item-price">₪' + App.fmtP(item.unitPrice * item.qty) + '</div>' +
              '<button class="cart-item-del" onclick="App.Cart.remove(\'' + item.product.id + '\')">' +
                '<span class="material-icons-round">delete_outline</span>' +
              '</button></div>';
          }).join('') +
          (needsShip
            ? '<div class="cart-item shipping-row">' +
                '<div class="cart-item-icon">🚚</div>' +
                '<div class="cart-item-info"><span class="cart-item-name">דמי משלוח</span><span class="cart-item-sku">מק"ט 1000</span></div>' +
                '<div class="cart-item-qty"><span>1</span></div>' +
                '<div class="cart-item-price">₪' + shipCost + '</div></div>'
            : '') +
          '</div>' +
          '<div class="cart-summary">' +
            CartView._summaryHTML(totals, needsShip, shipCost, minAmt) +
          '</div>';

    panel.innerHTML =
      '<div class="cart-panel-inner">' +
        '<div class="cart-header">' +
          '<button class="btn-back-edit" onclick="App.closeCart()">' +
            '<span class="material-icons-round">arrow_forward</span> חזרה לעריכה' +
          '</button>' +
          '<h3><span class="material-icons-round">shopping_cart</span> עגלת קניות' +
            (cart.length > 0 ? ' <span style="font-size:13px;font-weight:500;color:var(--text-muted)">(' + App.Cart.count() + ' פריטים)</span>' : '') +
          '</h3>' +
          '<button class="cart-close-x" onclick="App.closeCart()"><span class="material-icons-round">close</span></button>' +
        '</div>' +
        itemsHTML +
      '</div>';
  },

  _summaryHTML: function (totals, needsShip, shipCost, minAmt) {
    var remaining = App.fmtP(minAmt - App.Cart.subtotal());
    return '<div class="summary-row"><span>סה"כ לפני מע"מ</span><span>₪' + App.fmtP(totals.subtotal) + '</span></div>' +
      '<div class="summary-row"><span>מע"מ (18%)</span><span>₪' + App.fmtP(totals.vat) + '</span></div>' +
      '<div class="summary-row total"><span>סה"כ סופי</span><span>₪' + App.fmtP(totals.total) + '</span></div>' +
      (totals.savings > 0 ? '<div class="summary-savings">חסכת בהזמנה זו: ₪' + App.fmtP(totals.savings) + '</div>' : '') +
      (needsShip && App.state.cart.length > 0
        ? '<div class="shipping-notice"><span class="material-icons-round">info</span> עוד ₪' + remaining + ' למשלוח חינם</div>'
        : (App.state.cart.length > 0 ? '<div class="free-shipping-notice"><span class="material-icons-round">local_shipping</span> משלוח חינם!</div>' : '')) +
      '<div class="cart-notes"><label>הערות להזמנה</label><textarea id="cv-notes" placeholder="הערות אופציונליות..." rows="2"></textarea></div>' +
      '<button class="btn-submit-order" onclick="CartView.submit()" ' + (App.state.cart.length === 0 ? 'disabled style="opacity:.4"' : '') + '>' +
        '<span class="material-icons-round">send</span> שלח הזמנה' +
      '</button>';
  },

  submit: function () {
    var notes = document.getElementById('cv-notes');
    var nVal  = notes ? notes.value : '';

    /* אזהרה: מוצרים חסרים במלאי */
    if (App.Cart.hasOOS()) {
      var oosList = App.state.cart.filter(function (i) { return i.outOfStock || i.product.stock === 0; });
      var oosNames = oosList.map(function (i) { return '• ' + i.product.name; }).join('<br>');
      App.showModal(
        '<div class="sys-message">' +
          '<div class="sys-icon" style="background:var(--orange-dim);color:var(--orange)"><span class="material-icons-round" style="font-size:30px">schedule</span></div>' +
          '<h3>שים לב — מוצרים חסרים במלאי</h3>' +
          '<p style="text-align:right">' + oosNames + '</p>' +
          '<p>ייתכן עיכוב של יום בהמשלוח עבור מוצרים אלו.</p>' +
          '<div style="display:flex;gap:10px;margin-top:12px">' +
            '<button class="btn-primary orange" onclick="App.closeModal();CartView._doSubmit(\'' + nVal.replace(/'/g, "\\'") + '\')">אישור ושליחה בכל זאת</button>' +
            '<button class="btn-secondary" onclick="App.closeModal()">חזרה לעריכה</button>' +
          '</div></div>'
      );
      return;
    }

    CartView._doSubmit(nVal);
  },

  _doSubmit: function (nVal) {
    if (App.Cart.needsShipping() && App.state.cart.length > 0) {
      var sc = App.Cart.getShippingCost();
      App.showModal(
        '<div class="sys-message">' +
          '<div class="sys-icon orange"><span class="material-icons-round" style="font-size:30px">local_shipping</span></div>' +
          '<h3>שים לב — ייתווספו דמי משלוח</h3>' +
          '<p>ההזמנה פחות מ-₪' + App.state.settings.minOrderAmount + '<br>יתווספו דמי משלוח: <strong>₪' + sc + '</strong></p>' +
          '<div style="display:flex;gap:10px;margin-top:12px">' +
            '<button class="btn-primary orange" onclick="App.closeModal();App.Orders.submit(\'' + nVal.replace(/'/g, "\\'") + '\')">אישור ושליחה</button>' +
            '<button class="btn-secondary" onclick="App.closeModal()">חזרה לעריכה</button>' +
          '</div></div>'
      );
    } else {
      App.Orders.submit(nVal);
    }
  }
};
