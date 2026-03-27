#!/usr/bin/env node
/**
 * Test script for new financial data endpoints
 */

const financialDataService = require('./engine/financialDataService');
const financialAnalyzer = require('./engine/financialAnalyzer');

async function runTests() {
  console.log('🧪 Testing Financial Data Integration...\n');

  try {
    // Test 1: Financial Health Score
    console.log('📊 Test 1: Financial Health Score (TCS.NS)');
    const healthScore = await financialDataService.getFinancialHealthScore('TCS.NS');
    console.log('✅ Health Score:', healthScore.healthScore);
    console.log('   Interpretation:', healthScore.interpretation);
    console.log('   Events count:', healthScore.recentEventCount);
    console.log('   Patterns:', healthScore.aggregatedPatterns.length);
    console.log();

    // Test 2: Financial Events
    console.log('📝 Test 2: Financial Events (INFY.NS)');
    const events = await financialDataService.getFinancialEvents('INFY.NS');
    console.log(`✅ Events found: ${events.length}`);
    events.slice(0, 3).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.type}: ${e.title} (Impact: ${e.impactScore})`);
    });
    console.log();

    // Test 3: Financial Signal Analysis
    console.log('🎯 Test 3: Financial Signal Analysis (HDFC.NS at ₹2200)');
    const signal = await financialAnalyzer.analyzeFinancialSignal('HDFC.NS', 2200);
    console.log('✅ Signal generated:');
    console.log(`   Decision: ${signal.decision}`);
    console.log(`   Confidence: ${signal.confidence}%`);
    console.log(`   Time Horizon: ${signal.timeHorizon}`);
    console.log(`   Entry Range: ₹${signal.execution.entryRange.start} - ₹${signal.execution.entryRange.end}`);
    console.log(`   Stop Loss: ₹${signal.execution.stopLoss}`);
    console.log(`   Target: ₹${signal.execution.targetPrice}`);
    console.log(`   Max Drawdown: ${signal.execution.maxDrawdownPercent}%`);
    console.log();

    // Test 4: Health Scores for different symbols
    console.log('📈 Test 4: Comparative Health Scores');
    const symbols = ['TCS.NS', 'INFY.NS', 'HDFC.NS'];
    for (const sym of symbols) {
      const hs = await financialDataService.getFinancialHealthScore(sym);
      console.log(`   ${sym}: ${hs.healthScore.toFixed(2)} (${hs.interpretation.substring(0, 40)}...)`);
    }
    console.log();

    console.log('✅ All tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
