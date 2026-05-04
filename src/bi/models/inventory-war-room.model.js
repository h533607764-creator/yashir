var BIInventoryWarRoomModel = (function () {
  'use strict';

  function money(n) {
    if (typeof App !== 'undefined' && App.fmtP) return '₪' + App.fmtP(n);
    return '₪' + String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function costPerUnit(p) {
    return p.qty > 0 && p.costTotal > 0 ? p.costTotal / p.qty : null;
  }

  function cloneProduct(p, reason) {
    var unitCost = costPerUnit(p);
    return {
      key: p.key,
      sku: p.sku,
      name: p.name,
      qty: p.qty,
      revenue: p.revenue,
      stock: p.stock,
      stockDays: p.stockDays,
      dailySales: parseFloat((p.dailySales || 0).toFixed(2)),
      daysSince: p.daysSince,
      tiedCapital: unitCost !== null && p.stock !== null ? parseFloat((unitCost * p.stock).toFixed(2)) : null,
      reason: reason
    };
  }

  function build(productModel, trust) {
    var products = productModel.products || [];
    var avgQty = products.length ? products.reduce(function (s, p) { return s + (p.qty || 0); }, 0) / products.length : 0;

    var likelyRunOutSoon = products.filter(function (p) {
      return p.stockDays !== null && p.stockDays <= 14;
    }).sort(function (a, b) { return a.stockDays - b.stockDays; }).slice(0, 10).map(function (p) {
      return cloneProduct(p, 'צפי חוסר בתוך ' + p.stockDays + ' ימים לפי קצב מכירה נוכחי');
    });

    var deadStock = products.filter(function (p) {
      return p.stock !== null && p.stock > 0 && (p.daysSince >= 60 || p.qty <= Math.max(1, avgQty * 0.15));
    }).sort(function (a, b) { return b.stock - a.stock; }).slice(0, 10).map(function (p) {
      return cloneProduct(p, 'מלאי קיים עם ביקוש נמוך/ישן בתקופה');
    });

    var slowMovers = products.filter(function (p) {
      return p.qty > 0 && p.qty <= Math.max(1, avgQty * 0.4) && p.daysSince >= 14;
    }).sort(function (a, b) { return a.qty - b.qty; }).slice(0, 10).map(function (p) {
      return cloneProduct(p, 'נמכר מעט ביחס לממוצע המוצרים בתקופה');
    });

    var highVelocity = products.filter(function (p) {
      return p.dailySales > 0;
    }).sort(function (a, b) { return b.dailySales - a.dailySales; }).slice(0, 10).map(function (p) {
      return cloneProduct(p, 'קצב מכירה יומי גבוה');
    });

    var tiedCapital = products.map(function (p) {
      return cloneProduct(p, 'מלאי × עלות יחידה מתוך פריטי הזמנה');
    }).filter(function (p) {
      return p.tiedCapital !== null && p.tiedCapital > 0;
    }).sort(function (a, b) { return b.tiedCapital - a.tiedCapital; }).slice(0, 10);

    var restockPriorities = likelyRunOutSoon.map(function (p) {
      var protectedRevenue = p.dailySales > 0 ? parseFloat((p.dailySales * (p.revenue / Math.max(1, p.qty)) * 7).toFixed(2)) : 0;
      p.priority = protectedRevenue;
      p.reason += ' | הכנסה שבועית מוגנת משוערת ' + money(protectedRevenue);
      return p;
    }).sort(function (a, b) { return b.priority - a.priority; }).slice(0, 5);

    return {
      likelyRunOutSoon: likelyRunOutSoon,
      deadStock: deadStock,
      slowMovers: slowMovers,
      highVelocity: highVelocity,
      tiedCapital: tiedCapital,
      restockPriorities: restockPriorities,
      confidence: trust.inventory,
      formula: 'ימי מלאי = מלאי בפריט הזמנה ÷ מכירה יומית בתקופה; הון קשור = מלאי × עלות יחידה כאשר קיימת עלות'
    };
  }

  return { build: build };
})();
