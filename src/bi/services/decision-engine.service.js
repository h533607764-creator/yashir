var BIDecisionEngineService = (function () {
  'use strict';

  function fmtP(n) {
    if (typeof App !== 'undefined' && App.fmtP) return App.fmtP(n);
    return String(parseFloat(n || 0).toFixed(2)).replace(/\.00$/, '');
  }

  function build(ctx, productModel) {
    var actions = [];
    var maxRevenue = Math.max(1, ctx.summary.revenue || 1);

    function confidence(rows, hasComparison) {
      return BIScoringEngine.confidenceScore(ctx.filtered.length, rows, hasComparison);
    }

    function addAction(data) {
      data.revenueImpact = parseFloat((data.revenueImpact || 0).toFixed(2));
      data.riskReduction = BIScoringEngine.clamp(data.riskReduction || 0);
      data.urgency = BIScoringEngine.clamp(data.urgency || 0);
      var score = BIScoringEngine.priorityScore(data.revenueImpact, maxRevenue, data.riskReduction, data.urgency);
      data.revenueScore = score.revenueScore;
      data.priorityScore = score.priorityScore;
      data.confidence = BIScoringEngine.clamp(data.confidence || 0);
      actions.push(data);
    }

    ctx.inventoryInsights.risks.forEach(function (p) {
      var protectedRevenue = parseFloat((p.dailySales * p.revenue / Math.max(1, p.qty) * 7).toFixed(2));
      var urgency = p.stockDays <= 3 ? 100 : (p.stockDays <= 7 ? 85 : 65);
      var riskLevel = p.stockDays <= 7 ? 'HIGH RISK' : 'MEDIUM RISK';
      addAction({
        title: 'לתעדף חידוש מלאי: ' + p.name,
        impactType: 'stock',
        revenueImpact: protectedRevenue,
        riskReduction: riskLevel === 'HIGH RISK' ? 90 : 70,
        urgency: urgency,
        confidence: confidence(ctx.inventoryInsights.productsWithStock, false),
        reasoning: 'המוצר צפוי להיגמר בעוד ' + p.stockDays + ' ימים לפי קצב מכירה יומי.',
        source: 'orders.items.product.stock + qty + unitPrice',
        method: 'ימים עד חוסר = מלאי מתוך ההזמנה ÷ מכירה יומית בתקופה',
        assumptions: 'אין שינוי מלאי בפועל. זו המלצה בלבד לפי צילום המלאי שהיה בפריטי ההזמנה.',
        simulation: {
          revenue: '+₪' + fmtP(protectedRevenue) + ' הכנסה מוגנת משבוע מכירות',
          margin: 'לא חושב אם חסרה עלות בפריטי הזמנה',
          stock: 'מפחית סיכון חוסר, ללא כתיבה למלאי',
          customer: 'מפחית סיכון אובדן הזמנות עקב חוסר'
        }
      });
    });

    ctx.customerInsights.churn.forEach(function (c) {
      var avgOrder = c.orders > 0 ? c.revenue / c.orders : 0;
      addAction({
        title: 'ליצור קשר עם לקוח בסיכון: ' + c.name,
        impactType: 'retention',
        revenueImpact: avgOrder,
        riskReduction: c.daysSince >= 60 ? 90 : 70,
        urgency: c.daysSince >= 60 ? 90 : 65,
        confidence: confidence(ctx.customerInsights.customerCount, false),
        reasoning: 'לקוח בעל ערך לא הזמין ' + c.daysSince + ' ימים.',
        source: 'orders.customerId/customerName + orders.items',
        method: 'לקוח בסיכון = הכנסה היסטורית מעל ממוצע לקוח + 30+ ימים ללא הזמנה',
        assumptions: 'ההכנסה המדומה היא ממוצע הזמנה היסטורי. אין שינוי לקוח בפועל.',
        simulation: {
          revenue: '+₪' + fmtP(avgOrder) + ' הכנסה אפשרית אם הלקוח חוזר להזמין',
          margin: 'לא חושב אם חסרה עלות בפריטי הזמנה',
          stock: 'אין שינוי מלאי',
          customer: 'הפחתת סיכון נטישה'
        }
      });
    });

    productModel.products.filter(function (p) {
      return p.qty > 0 && p.categoryAvgPrice > 0 && p.avgPrice < p.categoryAvgPrice * 0.92;
    }).sort(function (a, b) {
      return (b.categoryAvgPrice - b.avgPrice) * b.qty - (a.categoryAvgPrice - a.avgPrice) * a.qty;
    }).slice(0, 5).forEach(function (p) {
      var upside = parseFloat(((p.categoryAvgPrice - p.avgPrice) * p.qty * 0.5).toFixed(2));
      if (upside <= 0) return;
      addAction({
        title: 'לבחון מחיר למוצר: ' + p.name,
        impactType: 'revenue',
        revenueImpact: upside,
        riskReduction: 35,
        urgency: p.qty >= 5 ? 70 : 45,
        confidence: confidence(productModel.products.length, true),
        reasoning: 'מחיר ממוצע נמוך מממוצע הקטגוריה לפי הזמנות בפועל.',
        source: 'orders.items.unitPrice + orders.items.product.category',
        method: 'אפסייד = חצי מהפער מול מחיר ממוצע קטגוריה × כמות שנמכרה',
        assumptions: 'סימולציה בלבד. אין עדכון מחיר ואין הנחת תגובת לקוחות.',
        simulation: {
          revenue: '+₪' + fmtP(upside) + ' אפסייד אפשרי',
          margin: p.marginAvailable ? '+₪' + fmtP(upside) + ' לפני שינוי עלויות' : 'לא חושב כי חסרה עלות בפריטי הזמנה',
          stock: 'אין שינוי מלאי',
          customer: 'סיכון לקוח לא חושב ללא נתוני נטישה לפי מחיר'
        }
      });
    });

    productModel.categories.filter(function (c) {
      return c.revenue > 0 && c.growthPct >= 20;
    }).slice(0, 3).forEach(function (c) {
      var upside = parseFloat((c.revenue * Math.min(c.growthPct, 50) / 100 * 0.5).toFixed(2));
      addAction({
        title: 'לתעדף קטגוריה בצמיחה: ' + c.name,
        impactType: 'revenue',
        revenueImpact: upside,
        riskReduction: 25,
        urgency: c.growthPct >= 50 ? 75 : 55,
        confidence: confidence(productModel.categories.length, true),
        reasoning: 'הקטגוריה צמחה ב-' + c.growthPct + '% מול התקופה הקודמת.',
        source: 'orders.items.product.category + revenue by period',
        method: 'אפסייד = הכנסות קטגוריה × חצי משיעור הצמיחה, מוגבל ל-50%',
        assumptions: 'סימולציה בלבד. אין שינוי קטלוג או מלאי.',
        simulation: {
          revenue: '+₪' + fmtP(upside) + ' אפסייד אפשרי',
          margin: 'לא חושב אם חסרות עלויות בפריטי הזמנה',
          stock: 'עשוי להגדיל צורך במלאי, ללא כתיבה',
          customer: 'אין שינוי לקוח'
        }
      });
    });

    if (ctx.summary.revenue < ctx.prevSummary.revenue && ctx.previous.length > 0) {
      var drop = parseFloat((ctx.prevSummary.revenue - ctx.summary.revenue).toFixed(2));
      addAction({
        title: 'לטפל בירידת הכנסות מול תקופה קודמת',
        impactType: 'risk',
        revenueImpact: drop,
        riskReduction: 75,
        urgency: 70,
        confidence: confidence(ctx.filtered.length, true),
        reasoning: 'נמצא פער הכנסות של ₪' + fmtP(drop) + ' מול התקופה הקודמת.',
        source: 'orders.items revenue by current/previous period',
        method: 'פער = הכנסות תקופה קודמת פחות הכנסות תקופה נוכחית',
        assumptions: 'לא מבוצעת פעולה אוטומטית. יש לבדוק לקוחות ומוצרים מובילים.',
        simulation: {
          revenue: '+₪' + fmtP(drop) + ' הכנסה לשיקום אם חוזרים לרמת התקופה הקודמת',
          margin: 'לא חושב אם חסרות עלויות',
          stock: 'אין שינוי מלאי',
          customer: 'תלוי בזיהוי לקוחות/מוצרים שירדו'
        }
      });
    }

    actions.sort(function (a, b) { return b.priorityScore - a.priorityScore; });
    return actions.slice(0, 10);
  }

  return { build: build };
})();
