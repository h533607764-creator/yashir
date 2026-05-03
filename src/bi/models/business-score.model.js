var BIBusinessScoreModel = (function () {
  'use strict';

  function build(summary, prevSummary, customerInsights, inventoryInsights, currentOrders, previousOrders) {
    return BIScoringEngine.businessScore(summary, prevSummary, customerInsights, inventoryInsights, currentOrders, previousOrders);
  }

  return { build: build };
})();
