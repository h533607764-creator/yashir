var BIDataLoader = (function () {
  'use strict';

  function orderTimestampMs(o) {
    if (!o) return 0;
    var ts = o.timestamp;
    if (ts == null || ts === '') return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts === 'object' && typeof ts.seconds === 'number') {
      return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
    }
    var d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function periodRange(period) {
    var now = new Date();
    var start = null;
    if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'quarter') start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    else if (period === 'halfyear') start = new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1);
    else if (period === 'year') start = new Date(now.getFullYear(), 0, 1);
    if (!start) start = new Date(0);
    return { start: start, end: now };
  }

  function previousRange(range) {
    var len = range.end.getTime() - range.start.getTime();
    var prevEnd = new Date(range.start.getTime());
    return { start: new Date(prevEnd.getTime() - len), end: prevEnd };
  }

  function filterOrdersInRange(orders, range) {
    return (orders || []).filter(function (o) {
      var ms = orderTimestampMs(o);
      if (!ms) return false;
      return ms >= range.start.getTime() && ms < range.end.getTime();
    });
  }

  function validOrders(orders) {
    return (orders || []).filter(function (o) { return orderTimestampMs(o) > 0; });
  }

  function isProductLine(item) {
    var p = item && item.product ? item.product : {};
    return !(p.id === 'ship-1000' || p.category === 'shipping' || String(p.sku) === '1000');
  }

  function lineRevenue(item) {
    var qty = parseFloat(item && item.qty);
    var unitPrice = parseFloat(item && item.unitPrice);
    if (isNaN(qty) || isNaN(unitPrice)) return 0;
    return parseFloat((qty * unitPrice).toFixed(2));
  }

  function lineCost(item) {
    item = item || {};
    var p = item && item.product ? item.product : {};
    var vals = [item.unitCost, item.cost, p.unitCost, p.cost, p.costPrice, p.purchasePrice, p.supplierCost];
    for (var i = 0; i < vals.length; i++) {
      var n = parseFloat(vals[i]);
      if (!isNaN(n) && n >= 0) return n;
    }
    return null;
  }

  function productKey(item) {
    var p = item && item.product ? item.product : {};
    return String(p.id || p.sku || p.name || 'unknown');
  }

  function productName(item) {
    var p = item && item.product ? item.product : {};
    if (typeof pLang === 'function') return pLang(p, 'name') || p.name || 'מוצר לא מזוהה';
    return p.name || 'מוצר לא מזוהה';
  }

  function customerLabel(name) {
    if (typeof I18n === 'undefined' || I18n.getLang() !== 'en' || !name) return name;
    var list = typeof CUSTOMERS_DB !== 'undefined' ? CUSTOMERS_DB : [];
    var cu = list.find(function (x) { return x.name === name; });
    return (cu && cu.name_en) ? cu.name_en : name;
  }

  function dateKey(date, grain) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (grain === 'weekly') d.setDate(d.getDate() - d.getDay());
    if (grain === 'monthly') d = new Date(date.getFullYear(), date.getMonth(), 1);
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  return {
    orderTimestampMs: orderTimestampMs,
    periodRange: periodRange,
    previousRange: previousRange,
    filterOrdersInRange: filterOrdersInRange,
    validOrders: validOrders,
    isProductLine: isProductLine,
    lineRevenue: lineRevenue,
    lineCost: lineCost,
    productKey: productKey,
    productName: productName,
    customerLabel: customerLabel,
    dateKey: dateKey
  };
})();
