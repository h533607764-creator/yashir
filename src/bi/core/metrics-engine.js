var BIMetricsEngine = (function () {
  'use strict';

  function pctChange(current, previous) {
    current = parseFloat(current) || 0;
    previous = parseFloat(previous) || 0;
    if (previous === 0) return current === 0 ? 0 : 100;
    return parseFloat(((current - previous) / Math.abs(previous) * 100).toFixed(1));
  }

  function aggregate(list) {
    var out = { revenue: 0, qty: 0, stockMovement: 0, orders: list.length, profit: 0, profitLines: 0, missingCostLines: 0 };
    list.forEach(function (o) {
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        var qty = parseFloat(item.qty);
        if (isNaN(qty)) qty = 0;
        var revenue = BIDataLoader.lineRevenue(item);
        out.revenue += revenue;
        out.qty += qty;
        out.stockMovement += qty;
        var cost = BIDataLoader.lineCost(item);
        if (cost === null) {
          out.missingCostLines += 1;
        } else {
          out.profit += revenue - (cost * qty);
          out.profitLines += 1;
        }
      });
    });
    out.revenue = parseFloat(out.revenue.toFixed(2));
    out.qty = parseFloat(out.qty.toFixed(2));
    out.stockMovement = parseFloat(out.stockMovement.toFixed(2));
    out.profit = parseFloat(out.profit.toFixed(2));
    out.profitAvailable = out.profitLines > 0 && out.missingCostLines === 0;
    return out;
  }

  function products(list) {
    var map = {};
    list.forEach(function (o) {
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        var key = BIDataLoader.productKey(item);
        var qty = parseFloat(item.qty);
        if (isNaN(qty)) qty = 0;
        if (!map[key]) {
          var p = item.product || {};
          map[key] = { key: key, sku: p.sku || '—', name: BIDataLoader.productName(item), qty: 0, revenue: 0 };
        }
        map[key].qty += qty;
        map[key].revenue += BIDataLoader.lineRevenue(item);
      });
    });
    Object.keys(map).forEach(function (k) {
      map[k].qty = parseFloat(map[k].qty.toFixed(2));
      map[k].revenue = parseFloat(map[k].revenue.toFixed(2));
    });
    return map;
  }

  function series(list, grain) {
    var map = {};
    list.forEach(function (o) {
      var ms = BIDataLoader.orderTimestampMs(o);
      if (!ms) return;
      var key = BIDataLoader.dateKey(new Date(ms), grain);
      if (!map[key]) map[key] = { label: key, revenue: 0, qty: 0, profit: 0, profitAvailable: true, profitLines: 0 };
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        var qty = parseFloat(item.qty);
        if (isNaN(qty)) qty = 0;
        var revenue = BIDataLoader.lineRevenue(item);
        map[key].revenue += revenue;
        map[key].qty += qty;
        var cost = BIDataLoader.lineCost(item);
        if (cost === null) {
          map[key].profitAvailable = false;
        } else {
          map[key].profit += revenue - (cost * qty);
          map[key].profitLines += 1;
        }
      });
    });
    return Object.keys(map).sort().map(function (key) {
      var row = map[key];
      row.revenue = parseFloat(row.revenue.toFixed(2));
      row.qty = parseFloat(row.qty.toFixed(2));
      row.profit = parseFloat(row.profit.toFixed(2));
      row.profitAvailable = row.profitAvailable && row.profitLines > 0;
      return row;
    });
  }

  function productModel(filtered, previous, range) {
    var current = {};
    var prev = {};
    var categories = {};
    var prevCategories = {};
    var nowMs = range.end.getTime();

    function add(map, categoryMap, o) {
      var ms = BIDataLoader.orderTimestampMs(o);
      (o.items || []).forEach(function (item) {
        if (!BIDataLoader.isProductLine(item)) return;
        var p = item.product || {};
        var key = BIDataLoader.productKey(item);
        var qty = parseFloat(item.qty);
        if (isNaN(qty)) qty = 0;
        var revenue = BIDataLoader.lineRevenue(item);
        var category = p.categoryLabel || p.category || 'ללא קטגוריה';
        if (!map[key]) {
          map[key] = {
            key: key,
            sku: p.sku || '—',
            name: BIDataLoader.productName(item),
            category: category,
            qty: 0,
            revenue: 0,
            stock: typeof p.stock === 'number' && !isNaN(p.stock) ? p.stock : null,
            lastMs: 0,
            costLines: 0,
            costTotal: 0
          };
        }
        map[key].qty += qty;
        map[key].revenue += revenue;
        map[key].lastMs = Math.max(map[key].lastMs, ms || 0);
        if (typeof p.stock === 'number' && !isNaN(p.stock)) map[key].stock = p.stock;
        var cost = BIDataLoader.lineCost(item);
        if (cost !== null) {
          map[key].costLines += 1;
          map[key].costTotal += cost * qty;
        }
        if (!categoryMap[category]) categoryMap[category] = { name: category, qty: 0, revenue: 0 };
        categoryMap[category].qty += qty;
        categoryMap[category].revenue += revenue;
      });
    }

    filtered.forEach(function (o) { add(current, categories, o); });
    previous.forEach(function (o) { add(prev, prevCategories, o); });

    var days = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 864e5));
    var rows = Object.keys(current).map(function (key) {
      var p = current[key];
      var pr = prev[key] || { qty: 0, revenue: 0 };
      var cat = categories[p.category] || { qty: 0, revenue: 0 };
      p.qty = parseFloat(p.qty.toFixed(2));
      p.revenue = parseFloat(p.revenue.toFixed(2));
      p.avgPrice = p.qty > 0 ? parseFloat((p.revenue / p.qty).toFixed(2)) : 0;
      p.prevQty = parseFloat((pr.qty || 0).toFixed(2));
      p.prevRevenue = parseFloat((pr.revenue || 0).toFixed(2));
      p.categoryAvgPrice = cat.qty > 0 ? parseFloat((cat.revenue / cat.qty).toFixed(2)) : 0;
      p.dailySales = Math.max(0, p.qty / days);
      p.stockDays = p.stock !== null && p.dailySales > 0 ? parseFloat((p.stock / p.dailySales).toFixed(1)) : null;
      p.marginAvailable = p.costLines > 0 && p.qty > 0;
      p.margin = p.marginAvailable ? parseFloat((p.revenue - p.costTotal).toFixed(2)) : null;
      p.marginPct = p.marginAvailable && p.revenue > 0 ? parseFloat((p.margin / p.revenue * 100).toFixed(1)) : null;
      p.daysSince = p.lastMs ? Math.floor((nowMs - p.lastMs) / 864e5) : 999;
      return p;
    });

    var categoryRows = Object.keys(categories).map(function (key) {
      var c = categories[key];
      var pc = prevCategories[key] || { revenue: 0, qty: 0 };
      c.revenue = parseFloat(c.revenue.toFixed(2));
      c.qty = parseFloat(c.qty.toFixed(2));
      c.prevRevenue = parseFloat((pc.revenue || 0).toFixed(2));
      c.growthPct = pctChange(c.revenue, c.prevRevenue);
      return c;
    }).sort(function (a, b) { return b.growthPct - a.growthPct; });

    return { products: rows, categories: categoryRows };
  }

  return {
    aggregate: aggregate,
    products: products,
    series: series,
    productModel: productModel,
    pctChange: pctChange
  };
})();
