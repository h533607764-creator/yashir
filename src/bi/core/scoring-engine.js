var BIScoringEngine = (function () {
  'use strict';

  function clamp(n) {
    n = parseFloat(n);
    if (isNaN(n)) n = 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function confidenceLabel(points, needsPrevious) {
    points = points || {};
    var currentOrders = parseInt(points.currentOrders, 10) || 0;
    var previousOrders = parseInt(points.previousOrders, 10) || 0;
    var rows = parseInt(points.rows, 10) || 0;
    if (currentOrders >= 8 && (!needsPrevious || previousOrders >= 5) && rows >= 3) return 'גבוה';
    if (currentOrders >= 3 && (!needsPrevious || previousOrders >= 1) && rows >= 1) return 'בינוני';
    return 'נמוך';
  }

  function confidenceScore(ordersCount, rowsCount, hasComparison) {
    var score = 35;
    if (ordersCount >= 3) score += 20;
    if (ordersCount >= 8) score += 20;
    if (rowsCount >= 2) score += 10;
    if (rowsCount >= 5) score += 10;
    if (hasComparison) score += 5;
    return clamp(score);
  }

  function priorityScore(revenueImpact, maxRevenue, riskReduction, urgency) {
    var revenueScore = clamp(((parseFloat(revenueImpact) || 0) / Math.max(1, maxRevenue || 1)) * 100);
    return {
      revenueScore: revenueScore,
      priorityScore: clamp((revenueScore * 0.4) + (clamp(riskReduction) * 0.3) + (clamp(urgency) * 0.3))
    };
  }

  function businessScore(summary, prevSummary, customerInsights, inventoryInsights, currentOrders, previousOrders) {
    var confidence = confidenceLabel({
      currentOrders: currentOrders,
      previousOrders: previousOrders,
      rows: customerInsights.customerCount + inventoryInsights.productsWithSales
    }, true);
    if (currentOrders < 3 || (customerInsights.customerCount + inventoryInsights.productsWithSales) < 2) {
      return {
        score: null,
        confidence: confidence,
        parts: { revenueMomentum: 0, customerActivity: 0, stockHealth: 0, riskLevel: 0, growthTrend: 0 }
      };
    }
    var revenuePct = BIMetricsEngine.pctChange(summary.revenue, prevSummary.revenue);
    var qtyPct = BIMetricsEngine.pctChange(summary.qty, prevSummary.qty);
    var revenueMomentum = Math.max(0, Math.min(100, 50 + revenuePct));
    var customerActivity = Math.max(0, Math.min(100, customerInsights.customerCount ? (currentOrders / Math.max(1, customerInsights.customerCount)) * 35 : 0));
    var stockHealth = Math.max(0, 100 - (inventoryInsights.risks.length * 15));
    var riskLevel = Math.max(0, 100 - (customerInsights.churn.length * 12) - (inventoryInsights.risks.length * 10));
    var growthTrend = Math.max(0, Math.min(100, 50 + ((revenuePct + qtyPct) / 2)));
    var score = Math.round((revenueMomentum * 0.3) + (customerActivity * 0.2) + (stockHealth * 0.2) + (riskLevel * 0.15) + (growthTrend * 0.15));

    return {
      score: Math.max(0, Math.min(100, score)),
      confidence: confidence,
      parts: {
        revenueMomentum: Math.round(revenueMomentum),
        customerActivity: Math.round(customerActivity),
        stockHealth: Math.round(stockHealth),
        riskLevel: Math.round(riskLevel),
        growthTrend: Math.round(growthTrend)
      }
    };
  }

  return {
    clamp: clamp,
    confidenceLabel: confidenceLabel,
    confidenceScore: confidenceScore,
    priorityScore: priorityScore,
    businessScore: businessScore,
    priorityFormula: 'Score = (Revenue Impact * 0.4) + (Risk Reduction * 0.3) + (Urgency * 0.3)'
  };
})();
