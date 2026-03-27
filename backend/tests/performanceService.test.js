const assert = require('assert');
const {
  getSignalPerformance,
  getValidationMetrics,
  getStrategyPerformance,
} = require('../engine/performanceService');

function assertRange(value, min, max, label) {
  assert.ok(Number.isFinite(value), `${label} must be finite`);
  assert.ok(value >= min && value <= max, `${label} must be within [${min}, ${max}]`);
}

function runPerformanceServiceTests() {
  const buyMetrics = getSignalPerformance('BUY');
  assert.ok(buyMetrics.sampleSize > 0, 'BUY sample size should be positive');
  assertRange(buyMetrics.hitRate, 0, 1, 'BUY hit rate');
  assert.ok(Array.isArray(buyMetrics.hitRateCI95) && buyMetrics.hitRateCI95.length === 2, 'BUY hit rate CI95 must exist');
  assert.ok(buyMetrics.returnAttribution && buyMetrics.returnAttribution['5D'], 'BUY return attribution for 5D must exist');
  assert.ok(Array.isArray(buyMetrics.returnAttribution['5D'].ci95), 'BUY 5D return CI95 must exist');
  assert.ok(buyMetrics.worstDrawdown <= 0, 'BUY worst drawdown should be <= 0');

  const strategy = getStrategyPerformance();
  assert.ok(strategy.BUY && strategy.SELL && strategy.HOLD, 'Strategy performance must include BUY/SELL/HOLD');

  const validation = getValidationMetrics([]);
  assert.ok(validation.signalCount > 0, 'Validation signal count should be positive');
  assertRange(validation.hitRate, 0, 1, 'Validation hit rate');
  assert.ok(Array.isArray(validation.hitRateCI95) && validation.hitRateCI95.length === 2, 'Validation hit rate CI95 must exist');
  assert.ok(validation.returnAttribution && validation.returnAttribution['1D'] && validation.returnAttribution['3D'] && validation.returnAttribution['5D'], 'Validation return attribution must include 1D/3D/5D');
  assert.ok(validation.baselineComparison && Number.isFinite(validation.baselineComparison.outperformancePct), 'Baseline comparison must include outperformance');
  assert.ok(validation.maxDrawdown <= 0, 'Validation max drawdown should be <= 0');

  console.log('Performance service signal-quality tests passed.');
}

runPerformanceServiceTests();
