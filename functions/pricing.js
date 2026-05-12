'use strict';

var SHIPPING_LINE_IDS = { 'ship-1000': true };

function isShippingLineProduct(p) {
  return !!(p && (p.id === 'ship-1000' || p.category === 'shipping'));
}

function getBulkDiscountPct(product, qty) {
  var discounts = product.bulkDiscounts;
  if (!discounts || !discounts.length || !qty || qty < 1) return 0;
  var best = 0;
  discounts.forEach(function (d) {
    if (qty >= d.minQty && d.discountPct > best) best = d.discountPct;
  });
  return best;
}

function getUnitPrice(product, customer) {
  if (!customer) return null;
  var p = customer.personalPrices && customer.personalPrices[product.id];
  if (p !== undefined) return p;
  if (customer.generalDiscount > 0) {
    return parseFloat((product.price * (1 - customer.generalDiscount / 100)).toFixed(2));
  }
  return product.price;
}

function getEffectiveUnitPrice(product, customer, qty) {
  var basePrice = getUnitPrice(product, customer);
  if (basePrice === null) return null;
  var bulkPct = getBulkDiscountPct(product, qty);
  if (bulkPct > 0) {
    return parseFloat((basePrice * (1 - bulkPct / 100)).toFixed(2));
  }
  return basePrice;
}

function getTotalDiscountPct(product, customer, qty) {
  function getDiscountPct(prod, cust) {
    if (!cust) return 0;
    var pp = cust.personalPrices && cust.personalPrices[prod.id];
    if (pp !== undefined) {
      if (!prod.price || prod.price <= 0) return 0;
      return parseFloat(Math.max(0, (1 - pp / prod.price) * 100).toFixed(2));
    }
    return cust.generalDiscount || 0;
  }
  var personalPct = getDiscountPct(product, customer);
  var bulkPct = getBulkDiscountPct(product, qty);
  if (personalPct === 0 && bulkPct === 0) return 0;
  if (!product.price || product.price <= 0) return 0;
  var effectivePrice = product.price * (1 - personalPct / 100) * (1 - bulkPct / 100);
  return parseFloat(Math.max(0, (1 - effectivePrice / product.price) * 100).toFixed(2));
}

function calcTotals(items, vatRate) {
  var subtotal = 0;
  var savings = 0;
  items.forEach(function (i) {
    var q = Number(i.qty);
    if (isNaN(q)) q = 0;
    var lineTotal = parseFloat((i.unitPrice * q).toFixed(2));
    subtotal += lineTotal;
    var listP = typeof i.product.price === 'number' && !isNaN(i.product.price) ? i.product.price : 0;
    var saved = parseFloat(((listP - i.unitPrice) * q).toFixed(2));
    if (saved > 0) savings += saved;
  });
  subtotal = parseFloat(subtotal.toFixed(2));
  var vat = parseFloat((subtotal * vatRate).toFixed(2));
  return {
    subtotal: subtotal,
    vat: vat,
    total: parseFloat((subtotal + vat).toFixed(2)),
    savings: parseFloat(savings.toFixed(2))
  };
}

function shippingProductDoc(price) {
  return {
    id: 'ship-1000',
    sku: '1000',
    name: 'דמי משלוח',
    category: 'shipping',
    categoryLabel: 'משלוח',
    price: price,
    stock: 999,
    icon: '🚚',
    bgColor: '#141414',
    description: '',
    name_en: 'Shipping Fee',
    categoryLabel_en: 'Shipping',
    description_en: '',
    bulkDiscounts: []
  };
}

module.exports = {
  SHIPPING_LINE_IDS: SHIPPING_LINE_IDS,
  isShippingLineProduct: isShippingLineProduct,
  getEffectiveUnitPrice: getEffectiveUnitPrice,
  getTotalDiscountPct: getTotalDiscountPct,
  calcTotals: calcTotals,
  shippingProductDoc: shippingProductDoc
};
