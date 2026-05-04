var BITrustEngine = (function () {
  'use strict';

  function clamp(n) {
    return BIScoringEngine.clamp(n);
  }

  function labelFromScore(score) {
    score = clamp(score);
    if (score >= 75) return 'גבוה';
    if (score >= 50) return 'בינוני';
    return 'נמוך';
  }

  function explain(score, missing) {
    if (missing && missing.length) return 'חסרים נתונים: ' + missing.join(', ');
    if (score >= 75) return 'מבוסס על כמות הזמנות ופריטי order מספקת';
    if (score >= 50) return 'יש מספיק נתונים לכיוון כללי, אך המדגם עדיין מוגבל';
    return 'מדגם חלש. מומלץ להתייחס כאיתות בלבד';
  }

  function metric(ordersCount, rowsCount, hasComparison, missing) {
    var score = BIScoringEngine.confidenceScore(ordersCount, rowsCount, hasComparison);
    if (missing && missing.length) score -= Math.min(30, missing.length * 10);
    score = clamp(score);
    return {
      score: score,
      label: labelFromScore(score),
      explanation: explain(score, missing || [])
    };
  }

  function build(ctx, productModel) {
    var costMissing = ctx.summary && ctx.summary.missingCostLines > 0;
    var stockRows = productModel.products.filter(function (p) { return p.stock !== null; }).length;
    return {
      executive: metric(ctx.filtered.length, ctx.filtered.length + productModel.products.length, ctx.previous.length > 0, []),
      forecast: metric(ctx.orders.length, ctx.orders.length, true, ctx.orders.length < 7 ? ['פחות מ-7 הזמנות היסטוריות'] : []),
      customerDna: metric(ctx.orders.length, ctx.customerInsights.customerCount, true, ctx.customerInsights.customerCount < 3 ? ['פחות מ-3 לקוחות'] : []),
      inventory: metric(ctx.filtered.length, stockRows, false, stockRows === 0 ? ['אין שדה מלאי בפריטי הזמנה'] : []),
      profitLeak: metric(ctx.filtered.length, productModel.products.length, true, costMissing ? ['חסרות עלויות בחלק מפריטי ההזמנה'] : []),
      decisionLab: metric(ctx.filtered.length, productModel.products.length + ctx.customerInsights.customerCount, ctx.previous.length > 0, []),
      simulator: metric(ctx.orders.length, productModel.products.length, true, ctx.orders.length < 3 ? ['מעט הזמנות לסימולציה'] : []),
      reports: metric(ctx.filtered.length, ctx.filtered.length, ctx.previous.length > 0, [])
    };
  }

  return {
    build: build,
    metric: metric,
    labelFromScore: labelFromScore
  };
})();
