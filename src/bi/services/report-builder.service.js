var BIReportBuilderService = (function () {
  'use strict';

  var _cache = { key: '', value: null };

  function build(orders, period, grain) {
    var validOrders = BIDataLoader.validOrders(orders);
    var key = cacheKey(validOrders, period, grain);
    if (_cache.key === key && _cache.value) return _cache.value;

    var range = BIDataLoader.periodRange(period);
    var prevRange = BIDataLoader.previousRange(range);
    var filtered = BIDataLoader.filterOrdersInRange(validOrders, range);
    var previous = BIDataLoader.filterOrdersInRange(validOrders, prevRange);
    var summary = BIMetricsEngine.aggregate(filtered);
    var prevSummary = BIMetricsEngine.aggregate(previous);
    var series = BIMetricsEngine.series(filtered, grain);
    var productStats = BIMetricsEngine.products(filtered);
    var prevProducts = BIMetricsEngine.products(previous);
    var topRevenueProducts = topProducts(productStats, prevProducts, 'revenue');
    var topQtyProducts = topProducts(productStats, prevProducts, 'qty');
    var movementProducts = stockMovementProducts(productStats);
    var customerInsights = BICustomerIntelligenceModel.build(validOrders, filtered, Date.now());
    var inventoryInsights = BIInventoryIntelligenceModel.build(validOrders, filtered, range);
    var businessScore = BIBusinessScoreModel.build(summary, prevSummary, customerInsights, inventoryInsights, filtered.length, previous.length);
    var productModel = BIMetricsEngine.productModel(filtered, previous, range);
    var ctx = {
      orders: validOrders,
      filtered: filtered,
      previous: previous,
      range: range,
      prevRange: prevRange,
      summary: summary,
      prevSummary: prevSummary,
      customerInsights: customerInsights,
      inventoryInsights: inventoryInsights,
      productModel: productModel
    };
    var decisionEngine = {
      actions: BIDecisionEngineService.build(ctx, productModel),
      risks: BIRiskEngine.build(ctx, productModel),
      opportunities: BIOpportunityEngine.build(ctx, productModel),
      formula: BIScoringEngine.priorityFormula
    };
    var trustLayer = BITrustEngine.build(ctx, productModel);
    var customerDna = BICustomerDnaModel.build(ctx, trustLayer);
    var inventoryWarRoom = BIInventoryWarRoomModel.build(productModel, trustLayer);
    var profitLeak = BIProfitLeakEngine.build(ctx, productModel, customerDna, trustLayer);
    var forecast = BIPredictiveForecastEngine.build(ctx, productModel, customerDna, trustLayer);
    var executiveIntelligence = BIExecutiveIntelligenceService.build(ctx, productModel, decisionEngine, forecast, customerDna, inventoryWarRoom, profitLeak, trustLayer);

    _cache = {
      key: key,
      value: {
      orders: validOrders,
      range: range,
      prevRange: prevRange,
      filtered: filtered,
      previous: previous,
      summary: summary,
      prevSummary: prevSummary,
      series: series,
      productStats: productStats,
      prevProducts: prevProducts,
      topRevenueProducts: topRevenueProducts,
      topQtyProducts: topQtyProducts,
      movementProducts: movementProducts,
      customerInsights: customerInsights,
      inventoryInsights: inventoryInsights,
      businessScore: businessScore,
      decisionEngine: decisionEngine,
      trustLayer: trustLayer,
      forecast: forecast,
      customerDna: customerDna,
      inventoryWarRoom: inventoryWarRoom,
      profitLeak: profitLeak,
      executiveIntelligence: executiveIntelligence,
      revenueTrendPct: BIMetricsEngine.pctChange(summary.revenue, prevSummary.revenue),
      confidence: {
        revenueTrend: BIScoringEngine.confidenceLabel({ currentOrders: filtered.length, previousOrders: previous.length, rows: filtered.length }, true),
        vip: BIScoringEngine.confidenceLabel({ currentOrders: filtered.length, previousOrders: previous.length, rows: customerInsights.vip.length }, false),
        churn: BIScoringEngine.confidenceLabel({ currentOrders: validOrders.length, previousOrders: 0, rows: customerInsights.customerCount }, false),
        inventory: BIScoringEngine.confidenceLabel({ currentOrders: filtered.length, previousOrders: 0, rows: inventoryInsights.productsWithStock }, false)
      }
      }
    };
    return _cache.value;
  }

  function cacheKey(orders, period, grain) {
    var maxMs = 0;
    var lineCount = 0;
    var revenue = 0;
    orders.forEach(function (o) {
      maxMs = Math.max(maxMs, BIDataLoader.orderTimestampMs(o));
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        lineCount += 1;
        revenue += BIDataLoader.lineRevenue(item);
      });
    });
    return [period, grain, orders.length, maxMs, lineCount, parseFloat(revenue.toFixed(2))].join('|');
  }

  function topProducts(productStats, prevProducts, metric) {
    var rows = Object.keys(productStats).map(function (pid) { return productStats[pid]; });
    rows.sort(function (a, b) { return b[metric] - a[metric]; });
    return rows.slice(0, 10).map(function (ps) {
      var prev = prevProducts[ps.key] ? prevProducts[ps.key][metric] : 0;
      return {
        key: ps.key,
        sku: ps.sku,
        name: ps.name,
        qty: ps.qty,
        revenue: ps.revenue,
        trendPct: BIMetricsEngine.pctChange(ps[metric], prev)
      };
    });
  }

  function stockMovementProducts(productStats) {
    var rows = Object.keys(productStats).map(function (pid) { return productStats[pid]; });
    rows.sort(function (a, b) { return b.qty - a.qty; });
    return rows.slice(0, 10);
  }

  return { build: build };
})();
