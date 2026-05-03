var BIRiskEngine = (function () {
  'use strict';

  function fmtP(n) {
    if (typeof App !== 'undefined' && App.fmtP) return App.fmtP(n);
    return String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function build(ctx, productModel) {
    var risks = [];

    ctx.inventoryInsights.risks.forEach(function (p) {
      var protectedRevenue = parseFloat((p.dailySales * p.revenue / Math.max(1, p.qty) * 7).toFixed(2));
      risks.push({
        level: p.stockDays <= 7 ? 'HIGH RISK' : 'MEDIUM RISK',
        title: p.name,
        why: 'מלאי נמוך מול קצב מכירה',
        impact: 'אובדן הכנסה צפוי עד ₪' + fmtP(protectedRevenue),
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, ctx.inventoryInsights.productsWithStock, false),
        source: 'orders.items'
      });
    });

    ctx.customerInsights.churn.forEach(function (c) {
      var avgOrder = c.orders > 0 ? c.revenue / c.orders : 0;
      risks.push({
        level: c.daysSince >= 60 ? 'HIGH RISK' : 'MEDIUM RISK',
        title: c.name,
        why: 'לקוח בעל ערך לא פעיל',
        impact: 'סיכון לאובדן הזמנה ממוצעת של ₪' + fmtP(avgOrder),
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, ctx.customerInsights.customerCount, false),
        source: 'orders'
      });
    });

    productModel.products.filter(function (p) {
      return p.marginAvailable && p.marginPct !== null && p.marginPct < 8;
    }).slice(0, 5).forEach(function (p) {
      risks.push({
        level: 'MEDIUM RISK',
        title: p.name,
        why: 'מרווח נמוך לפי עלויות שנמצאו בפריטי הזמנה',
        impact: 'מרווח של ' + p.marginPct + '% בלבד',
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, productModel.products.length, false),
        source: 'orders.items cost fields'
      });
    });

    if (ctx.summary.revenue < ctx.prevSummary.revenue && ctx.previous.length > 0) {
      var drop = parseFloat((ctx.prevSummary.revenue - ctx.summary.revenue).toFixed(2));
      risks.push({
        level: drop > ctx.prevSummary.revenue * 0.25 ? 'HIGH RISK' : 'MEDIUM RISK',
        title: 'ירידת הכנסות בתקופה',
        why: 'הכנסות התקופה נמוכות מהתקופה הקודמת',
        impact: 'פער הכנסות של ₪' + fmtP(drop),
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, ctx.filtered.length, true),
        source: 'orders.items'
      });
    }

    if (ctx.filtered.length > 0 && ctx.filtered.length < 3) {
      risks.push({
        level: 'LOW RISK',
        title: 'מדגם נתונים קטן',
        why: 'יש פחות מ-3 הזמנות בתקופה הנבחרת',
        impact: 'החלטות עסקיות עלולות להיות פחות מדויקות',
        confidence: BIScoringEngine.confidenceScore(ctx.filtered.length, ctx.filtered.length, false),
        source: 'orders'
      });
    }

    risks.sort(function (a, b) {
      var rank = { 'HIGH RISK': 3, 'MEDIUM RISK': 2, 'LOW RISK': 1 };
      return (rank[b.level] || 0) - (rank[a.level] || 0);
    });
    return risks.slice(0, 8);
  }

  return { build: build };
})();
