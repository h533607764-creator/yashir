var BIOpportunityEngine = (function () {
  'use strict';

  function build(ctx, productModel) {
    var opportunities = [];

    ctx.inventoryInsights.risks.forEach(function (p) {
      var protectedRevenue = parseFloat((p.dailySales * p.revenue / Math.max(1, p.qty) * 7).toFixed(2));
      opportunities.push({
        title: 'פריט בביקוש גבוה עם מלאי נמוך: ' + p.name,
        upside: protectedRevenue,
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, ctx.inventoryInsights.productsWithStock, false),
        action: 'בדיקת רכש/זמינות לפני חוסר מלאי',
        source: 'orders.items'
      });
    });

    ctx.customerInsights.churn.forEach(function (c) {
      var avgOrder = c.orders > 0 ? c.revenue / c.orders : 0;
      opportunities.push({
        title: 'החזרת VIP לא פעיל: ' + c.name,
        upside: avgOrder,
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, ctx.customerInsights.customerCount, false),
        action: 'שיחת שירות/בדיקת צורך להזמנה חוזרת',
        source: 'orders'
      });
    });

    productModel.products.filter(function (p) {
      return p.qty > 0 && p.categoryAvgPrice > 0 && p.avgPrice < p.categoryAvgPrice * 0.92;
    }).sort(function (a, b) {
      return (b.categoryAvgPrice - b.avgPrice) * b.qty - (a.categoryAvgPrice - a.avgPrice) * a.qty;
    }).slice(0, 5).forEach(function (p) {
      var upside = parseFloat(((p.categoryAvgPrice - p.avgPrice) * p.qty * 0.5).toFixed(2));
      if (upside <= 0) return;
      opportunities.push({
        title: 'מוצר מתומחר נמוך יחסית: ' + p.name,
        upside: upside,
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, productModel.products.length, true),
        action: 'בדיקת מחיר ידנית בלבד',
        source: 'orders.items'
      });
    });

    productModel.categories.filter(function (c) {
      return c.revenue > 0 && c.growthPct >= 20;
    }).slice(0, 3).forEach(function (c) {
      var upside = parseFloat((c.revenue * Math.min(c.growthPct, 50) / 100 * 0.5).toFixed(2));
      opportunities.push({
        title: 'קטגוריה עולה: ' + c.name,
        upside: upside,
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, productModel.categories.length, true),
        action: 'לתת עדיפות תפעולית ושיווקית לקטגוריה',
        source: 'orders.items'
      });
    });

    productModel.products.filter(function (p) {
      return p.stock !== null && p.stock > 0 && p.qty === 0;
    }).slice(0, 3).forEach(function (p) {
      opportunities.push({
        title: 'איתות פינוי מלאי: ' + p.name,
        upside: 0,
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, productModel.products.length, false),
        action: 'בדיקת מלאי איטי ידנית',
        source: 'orders.items.product.stock'
      });
    });

    opportunities.sort(function (a, b) { return b.upside - a.upside; });
    return opportunities.slice(0, 8);
  }

  return { build: build };
})();
