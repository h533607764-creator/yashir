var BIProfitLeakEngine = (function () {
  'use strict';

  function money(n) {
    if (typeof App !== 'undefined' && App.fmtP) return '₪' + App.fmtP(n);
    return '₪' + String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function customerLeaks(customerDna, summary) {
    var avgOrderValue = summary.orders > 0 ? summary.revenue / summary.orders : 0;
    return customerDna.customers.filter(function (c) {
      return c.orders >= 3 && c.avgOrder < avgOrderValue * 0.65;
    }).sort(function (a, b) {
      return b.orders - a.orders;
    }).slice(0, 8).map(function (c) {
      return {
        title: c.name,
        type: 'weak_customer_effort',
        impact: 0,
        reason: c.orders + ' הזמנות עם ממוצע הזמנה נמוך מהממוצע הכללי',
        confidence: customerDna.groups.loyal.confidence
      };
    });
  }

  function productLeaks(productModel, trust) {
    var rows = [];
    productModel.products.forEach(function (p) {
      if (p.marginAvailable && p.marginPct !== null && p.marginPct < 12) {
        rows.push({
          title: p.name,
          type: 'low_margin_product',
          impact: p.margin !== null ? p.margin : 0,
          reason: 'מרווח נמוך: ' + p.marginPct + '% לפי עלויות בפריטי הזמנה',
          confidence: trust.profitLeak
        });
      }
      if (p.qty >= 5 && p.marginAvailable && p.marginPct !== null && p.marginPct < 20) {
        rows.push({
          title: p.name,
          type: 'high_volume_low_profit',
          impact: p.margin !== null ? p.margin : 0,
          reason: 'נמכר הרבה אך מרוויח מעט יחסית לכמות',
          confidence: trust.profitLeak
        });
      }
      if (p.qty > 0 && p.categoryAvgPrice > 0 && p.avgPrice < p.categoryAvgPrice * 0.85) {
        rows.push({
          title: p.name,
          type: 'discount_abuse_signal',
          impact: parseFloat(((p.categoryAvgPrice - p.avgPrice) * p.qty).toFixed(2)),
          reason: 'מחיר ממוצע נמוך ב-15%+ מממוצע הקטגוריה',
          confidence: trust.profitLeak
        });
      }
    });
    return rows;
  }

  function build(ctx, productModel, customerDna, trust) {
    var leaks = productLeaks(productModel, trust).concat(customerLeaks(customerDna, ctx.summary));
    if (ctx.summary.profitAvailable && ctx.summary.revenue > 0) {
      var marginPct = (ctx.summary.profit / ctx.summary.revenue) * 100;
      if (marginPct < 15) {
        leaks.push({
          title: 'רווחיות כללית נמוכה',
          type: 'hidden_loss_pattern',
          impact: ctx.summary.profit,
          reason: 'מרווח תקופתי כולל ' + parseFloat(marginPct.toFixed(1)) + '% בלבד',
          confidence: trust.profitLeak
        });
      }
    }

    leaks.sort(function (a, b) {
      return Math.abs(b.impact || 0) - Math.abs(a.impact || 0);
    });

    return {
      leaks: leaks.slice(0, 12),
      confidence: trust.profitLeak,
      formula: 'דליפות רווח מזוהות לפי marginPct, פער ממחיר קטגוריה, כמות גבוהה עם מרווח נמוך, וממוצע הזמנה נמוך ללקוחות עם פעילות גבוהה',
      missingData: ctx.summary.missingCostLines > 0 ? 'חסרות עלויות ב-' + ctx.summary.missingCostLines + ' שורות, לכן חלק מהרווחיות מוצגת כביטחון נמוך/בינוני' : '',
      summary: leaks.length ? leaks.length + ' איתותים, הגבוה ביותר: ' + leaks[0].title + ' (' + money(leaks[0].impact) + ')' : 'לא זוהתה דליפת רווח ברורה'
    };
  }

  return { build: build };
})();
