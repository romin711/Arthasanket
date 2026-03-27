/**
 * tradePlanService.js
 * 
 * Generates executable trade plans from signals
 * Calculates: entry zones, stop losses, targets, position sizing, time horizons
 */

/**
 * Calculate volatility-based position sizing
 * Position size inversely proportional to volatility
 */
function calculatePositionSize(volatility, portfolioValue, riskProfile = 'moderate') {
  const profileRiskLimits = {
    conservative: 0.02, // 2% max per trade
    moderate: 0.04,     // 4% max
    aggressive: 0.06,   // 6% max
  };

  const baseRisk = profileRiskLimits[riskProfile] || profileRiskLimits.moderate;
  
  // Normalize volatility to 0-1 range (assume typical range 10-30%)
  const normalizedVol = Math.min(Math.max(volatility / 30, 0.1), 1);
  
  // Adjust position size: higher volatility = smaller position
  const adjustedRisk = baseRisk / normalizedVol;
  const sizePercent = Math.min(adjustedRisk, 0.08); // Cap at 8%

  return Number(sizePercent.toFixed(4));
}

/**
 * Calculate entry zone (range for order placement)
 * For BUY: use recent low to current price
 * For SELL: use current price to recent high
 */
function calculateEntryZone(decision, currentPrice, recentLow, recentHigh, rsi = 50) {
  const decision_upper = String(decision || 'BUY').toUpperCase();
  
  if (decision_upper === 'BUY') {
    // Entry zone: 1-2% below current price to 0.5% above
    const entryHigh = currentPrice * 1.005;
    const entryLow = Math.max(recentLow, currentPrice * 0.985);
    
    return {
      entryPrice: currentPrice,
      entryRangeLow: Number(entryLow.toFixed(2)),
      entryRangeHigh: Number(entryHigh.toFixed(2)),
      rationale: `Entry near ${currentPrice.toFixed(2)}, scale up if dips to ${entryLow.toFixed(2)}`,
    };
  } else if (decision_upper === 'SELL') {
    // Entry zone: 0.5% below to 1-2% above current price
    const entryLow = currentPrice * 0.995;
    const entryHigh = Math.min(recentHigh, currentPrice * 1.015);
    
    return {
      entryPrice: currentPrice,
      entryRangeLow: Number(entryLow.toFixed(2)),
      entryRangeHigh: Number(entryHigh.toFixed(2)),
      rationale: `Short entry near ${currentPrice.toFixed(2)}, scale if rallies to ${entryHigh.toFixed(2)}`,
    };
  } else {
    // HOLD: no entry needed
    return {
      entryPrice: currentPrice,
      entryRangeLow: currentPrice,
      entryRangeHigh: currentPrice,
      rationale: 'Hold current position',
    };
  }
}

/**
 * Calculate stop loss level
 * For BUY: below recent low + volatility buffer
 * For SELL: above recent high + volatility buffer
 */
function calculateStopLoss(decision, currentPrice, recentLow, recentHigh, volatility = 2) {
  const decision_upper = String(decision || 'BUY').toUpperCase();
  
  if (decision_upper === 'BUY') {
    // Stop below recent low, with volatility buffer
    const buffer = currentPrice * (volatility / 100) * 0.5; // 50% of volatility as buffer
    const stopLoss = Math.max(recentLow * 0.98, recentLow - buffer);
    return Number(stopLoss.toFixed(2));
  } else if (decision_upper === 'SELL') {
    // Stop above recent high, with volatility buffer
    const buffer = currentPrice * (volatility / 100) * 0.5;
    const stopLoss = Math.min(recentHigh * 1.02, recentHigh + buffer);
    return Number(stopLoss.toFixed(2));
  }
  
  return currentPrice;
}

/**
 * Calculate target prices
 * Target 1: Conservative (1:1 risk/reward)
 * Target 2: Aggressive (1.5x risk/reward or higher)
 */
function calculateTargets(decision, currentPrice, stopLoss, volatility = 2) {
  const decision_upper = String(decision || 'BUY').toUpperCase();
  const riskAmount = Math.abs(currentPrice - stopLoss);

  if (decision_upper === 'BUY') {
    // Upside targets
    const target1 = currentPrice + riskAmount; // 1:1 risk/reward
    const target2 = currentPrice + (riskAmount * 1.5); // 1.5:1 risk/reward
    
    return {
      target1: Number(target1.toFixed(2)),
      target2: Number(target2.toFixed(2)),
      riskRewardRatio: Number((riskAmount / riskAmount).toFixed(2)), // 1:1
    };
  } else if (decision_upper === 'SELL') {
    // Downside targets
    const target1 = currentPrice - riskAmount; // 1:1 risk/reward
    const target2 = currentPrice - (riskAmount * 1.5); // 1.5:1 risk/reward
    
    return {
      target1: Number(target1.toFixed(2)),
      target2: Number(target2.toFixed(2)),
      riskRewardRatio: Number((riskAmount / riskAmount).toFixed(2)), // 1:1
    };
  }

  return {
    target1: currentPrice,
    target2: currentPrice,
    riskRewardRatio: 0,
  };
}

/**
 * Determine time horizon based on signal type and indicators
 */
function calculateTimeHorizon(signalType, rsi) {
  // Map signal types to time horizons
  const horizonMap = {
    breakout: 5,
    meanreversion: 3,
    momentum: 7,
    reversal: 5,
    oversold: 3,
    overbought: 3,
  };

  let baseHorizon = horizonMap[signalType] || 5;

  // Adjust based on RSI extremeness
  if (rsi < 30 || rsi > 70) {
    baseHorizon = Math.max(baseHorizon - 1, 2); // Mean reversion = shorter horizon
  }

  return baseHorizon;
}

/**
 * Generate complete trade plan
 * 
 * @param {object} params
 * @returns {object} Complete executable trade plan
 */
function generateTradePlan(params = {}) {
  const {
    decision = 'HOLD',
    currentPrice = 100,
    recentLow = 95,
    recentHigh = 105,
    volatility = 2,
    riskProfile = 'moderate',
    signalType = 'momentum',
    rsi = 50,
    portfolioValue = 100000,
    rationale = 'Technical signal detected',
  } = params;

  // Skip plan generation for HOLD
  if (String(decision).toUpperCase() === 'HOLD') {
    return null;
  }

  // Calculate all plan components
  const entryZone = calculateEntryZone(decision, currentPrice, recentLow, recentHigh, rsi);
  const stopLoss = calculateStopLoss(decision, currentPrice, recentLow, recentHigh, volatility);
  const targets = calculateTargets(decision, currentPrice, stopLoss, volatility);
  const positionSize = calculatePositionSize(volatility, portfolioValue, riskProfile);
  const timeHorizon = calculateTimeHorizon(signalType, rsi);

  // Calculate risk per trade
  const riskPerTrade = Math.abs(currentPrice - stopLoss) * positionSize * portfolioValue / 100;

  return {
    decision: String(decision).toUpperCase(),
    entryPrice: Number(currentPrice.toFixed(2)),
    entryRangeLow: entryZone.entryRangeLow,
    entryRangeHigh: entryZone.entryRangeHigh,
    stopLoss: Number(stopLoss.toFixed(2)),
    targetPrice: targets.target1, // Primary target
    target2: targets.target2,     // Secondary target
    suggestedPositionSizePct: Number((positionSize * 100).toFixed(2)),
    timeHorizonDays: timeHorizon,
    riskPerTrade: Number(riskPerTrade.toFixed(2)),
    riskRewardRatio: targets.riskRewardRatio,
    rationale: rationale || entryZone.rationale,
  };
}

/**
 * Batch generate plans for multiple alerts
 */
function generatePlansForAlerts(alerts = [], portfolioValue = 100000) {
  return alerts.map((alert) => {
    const plan = generateTradePlan({
      decision: alert.action,
      currentPrice: alert.price || 100,
      recentLow: alert.recentLow || alert.price * 0.95,
      recentHigh: alert.recentHigh || alert.price * 1.05,
      volatility: alert.volatility || 2,
      riskProfile: alert.riskProfile || 'moderate',
      signalType: alert.signalType || 'momentum',
      rsi: alert.rsi || 50,
      portfolioValue,
      rationale: alert.explanation,
    });

    return {
      ...alert,
      executionPlan: plan,
    };
  });
}

module.exports = {
  generateTradePlan,
  generatePlansForAlerts,
  calculatePositionSize,
  calculateEntryZone,
  calculateStopLoss,
  calculateTargets,
  calculateTimeHorizon,
};
