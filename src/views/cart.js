var CartView = {
  renderPanel: function () {
    var panel = document.getElementById('cart-panel');
    if (!panel) return;
    var cart      = App.state.cart;
    var needsShip = App.Cart.needsShipping();
    var shipCost  = App.Cart.getShippingCost();
    var minAmt    = App.state.settings.minOrderAmount;

    var allItems = cart.slice();
    if (needsShip && cart.length > 0) {
      allItems.push({ product: Object.assign({}, SHIPPING_PRODUCT, { price: shipCost }), qty: 1, unitPrice: shipCost, discountPct: 0 });
    }
    var totals = App.Pricing.calcTotals(allItems);

    var itemsHTML = cart.length === 0
      ? '<div class="cart-empty"><span class="material-icons-round">shopping_cart</span><p>' + t('cart.empty') + '</p>' +
          '<button class="btn-primary" onclick="App.closeCart();App.navigate(\'catalog\')">' + t('cart.toCatalog') + '</button></div>'
      : '<div class="cart-items">' +
          cart.map(function (item) {
            var isOOS      = item.outOfStock || item.product.stock === 0;
            var lineTotal  = item.unitPrice * item.qty;
            var cust       = App.Auth.isCustomer() ? App.state.currentUser.customer : null;
            var basePrice  = cust ? App.Pricing.getUnitPrice(item.product, cust) : item.product.price;

            var bulkPct = item.product.bulkDiscounts
              ? App.Pricing.getBulkDiscountPct(item.product, item.qty)
              : 0;
            var personalPct = item.discountPct - bulkPct;
            if (personalPct < 0) personalPct = 0;

            var discInfo = '';
            if (item.discountPct > 0) {
              if (bulkPct > 0 && personalPct > 0) {
                discInfo = '<span class="cart-item-disc">' + t('cart.personalDiscount') + ' ' + App.fmtP(personalPct) + '% + ' + t('cart.bulkDiscount').toLowerCase() + ' ' + bulkPct + '% = <strong>' + App.fmtP(item.discountPct) + '%</strong></span>';
              } else if (bulkPct > 0) {
                discInfo = '<span class="cart-item-disc">' + t('cart.bulkDiscount') + ' <strong>' + bulkPct + '%</strong></span>';
              } else {
                discInfo = '<span class="cart-item-disc">' + t('cart.discount') + ' <strong>' + item.discountPct + '%</strong></span>';
              }
            }

            return '<div class="cart-item' + (isOOS ? ' cart-item-oos' : '') + '">' +
              '<div class="cart-item-icon">' + item.product.icon + '</div>' +
              '<div class="cart-item-info">' +
                '<span class="cart-item-name">' + App.escHTML(item.product.name) + '</span>' +
                '<span class="cart-item-sku">' + t('common.sku') + ' ' + App.escHTML(item.product.sku) + '</span>' +
                discInfo +
                (isOOS ? '<span class="cart-item-oos-note"><span class="material-icons-round" style="font-size:13px">schedule</span> ' + t('cart.oosNote') + '</span>' : '') +
              '</div>' +
              '<div class="cart-item-qty">' +
                '<button onclick="App.Cart.updateQty(\'' + item.product.id + '\',' + (item.qty - 1) + ')">−</button>' +
                '<span>' + item.qty + '</span>' +
                '<button onclick="App.Cart.updateQty(\'' + item.product.id + '\',' + (item.qty + 1) + ')">+</button>' +
              '</div>' +
              '<div class="cart-item-price-col">' +
                (item.qty > 1 && basePrice !== null && basePrice !== item.unitPrice
                  ? '<span class="cart-item-base-price">₪' + App.fmtP(item.unitPrice) + t('cart.perUnit') + '</span>'
                  : '') +
                '<span class="cart-item-price">₪' + App.fmtP(lineTotal) + '</span>' +
              '</div>' +
              '<button class="cart-item-del" onclick="App.Cart.remove(\'' + item.product.id + '\')">' +
                '<span class="material-icons-round">delete_outline</span>' +
              '</button></div>';
          }).join('') +
          (needsShip
            ? '<div class="cart-item shipping-row">' +
                '<div class="cart-item-icon">🚚</div>' +
                '<div class="cart-item-info"><span class="cart-item-name">' + t('cart.shippingFee') + '</span><span class="cart-item-sku">' + t('common.sku') + ' 1000</span></div>' +
                '<div class="cart-item-qty"><span>1</span></div>' +
                '<div class="cart-item-price-col"><span class="cart-item-price">₪' + shipCost + '</span></div></div>'
            : '') +
          '</div>' +
          '<div class="cart-summary">' +
            CartView._summaryHTML(totals, needsShip, shipCost, minAmt) +
          '</div>';

    panel.innerHTML =
      '<div class="cart-panel-inner">' +
        '<div class="cart-header">' +
          '<button class="btn-back-edit" onclick="App.closeCart()">' +
            '<span class="material-icons-round">' + (I18n.getLang() === 'en' ? 'arrow_back' : 'arrow_forward') + '</span> ' + t('cart.backToEdit') +
          '</button>' +
          '<h3><span class="material-icons-round">shopping_cart</span> ' + t('cart.title') +
            (cart.length > 0 ? ' <span style="font-size:13px;font-weight:500;color:var(--text-muted)">(' + App.Cart.count() + ' ' + t('cart.items') + ')</span>' : '') +
          '</h3>' +
          '<button class="cart-close-x" onclick="App.closeCart()"><span class="material-icons-round">close</span></button>' +
        '</div>' +
        itemsHTML +
      '</div>';
  },

  _summaryHTML: function (totals, needsShip, shipCost, minAmt) {
    var remaining = App.fmtP(minAmt - App.Cart.subtotal());
    return '<div class="summary-row"><span>' + t('cart.subtotal') + '</span><span>₪' + App.fmtP(totals.subtotal) + '</span></div>' +
      '<div class="summary-row"><span>' + t('cart.vat') + '</span><span>₪' + App.fmtP(totals.vat) + '</span></div>' +
      '<div class="summary-row total"><span>' + t('cart.totalWithVat') + '</span><span>₪' + App.fmtP(totals.total) + '</span></div>' +
      (totals.savings > 0 ? '<div class="summary-savings"><span class="material-icons-round">savings</span> ' + t('cart.savings') + ' ₪' + App.fmtP(totals.savings) + '</div>' : '') +
      (needsShip && App.state.cart.length > 0
        ? '<div class="shipping-notice"><span class="material-icons-round">info</span> ' + t('cart.moreForFreeShipping') + ' ₪' + remaining + ' ' + t('cart.forFreeShipping') + '</div>'
        : (App.state.cart.length > 0 ? '<div class="free-shipping-notice"><span class="material-icons-round">local_shipping</span> ' + t('cart.freeShipping') + '</div>' : '')) +
      '<div class="cart-notes"><label>' + t('cart.orderNotes') + '</label><textarea id="cv-notes" placeholder="' + t('cart.notesPlaceholder') + '" rows="2"></textarea></div>' +
      '<button class="btn-submit-order" onclick="CartView.submit()" ' + (App.state.cart.length === 0 ? 'disabled style="opacity:.4"' : '') + '>' +
        '<span class="material-icons-round">send</span> ' + t('cart.submitOrder') +
      '</button>';
  },

  _pendingNotes: '',

  submit: function () {
    var notes = document.getElementById('cv-notes');
    CartView._pendingNotes = notes ? notes.value : '';

    if (App.Cart.hasOOS()) {
      var oosList  = App.state.cart.filter(function (i) { return i.outOfStock || i.product.stock === 0; });
      var oosNames = oosList.map(function (i) { return '• ' + App.escHTML(i.product.name); }).join('<br>');
      App.showModal(
        '<div class="sys-message">' +
          '<div class="sys-icon" style="background:var(--orange-dim);color:var(--orange)"><span class="material-icons-round" style="font-size:30px">schedule</span></div>' +
          '<h3>' + t('cart.oosWarningTitle') + '</h3>' +
          '<p style="text-align:' + (I18n.getLang() === 'en' ? 'left' : 'right') + '">' + oosNames + '</p>' +
          '<p>' + t('cart.oosWarningText') + '</p>' +
          '<div style="display:flex;gap:10px;margin-top:12px">' +
            '<button class="btn-primary orange" onclick="App.closeModal();CartView._doSubmit()">' + t('cart.confirmAnyway') + '</button>' +
            '<button class="btn-secondary" onclick="App.closeModal()">' + t('cart.backToEdit') + '</button>' +
          '</div></div>'
      );
      return;
    }

    CartView._doSubmit();
  },

  _doSubmit: function () {
    var nVal = CartView._pendingNotes;
    if (App.Cart.needsShipping() && App.state.cart.length > 0) {
      var sc = App.Cart.getShippingCost();
      App.showModal(
        '<div class="sys-message">' +
          '<div class="sys-icon orange"><span class="material-icons-round" style="font-size:30px">local_shipping</span></div>' +
          '<h3>' + t('cart.shippingWarningTitle') + '</h3>' +
          '<p>' + t('cart.orderLessThan') + App.state.settings.minOrderAmount + ' ' + t('cart.beforeVat') + '<br>' + t('cart.shippingAdded') + ' <strong>₪' + sc + '</strong></p>' +
          '<div style="display:flex;gap:10px;margin-top:12px">' +
            '<button class="btn-primary orange" onclick="App.closeModal();App.Orders.submit(CartView._pendingNotes)">' + t('cart.confirmSend') + '</button>' +
            '<button class="btn-secondary" onclick="App.closeModal()">' + t('cart.backToEdit') + '</button>' +
          '</div></div>'
      );
    } else {
      App.Orders.submit(nVal);
    }
  }
};
