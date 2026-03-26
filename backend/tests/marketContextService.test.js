const assert = require('assert');
const path = require('path');

// Load the market context service
const marketContextService = require(path.join(__dirname, '../engine/marketContextService'));

// Simple test runner
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertCloseTo(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ~${expected}, got ${actual} (tolerance: ${tolerance})`);
  }
}

// Tests for sourceCredibilityTier (internal function via getMarketContextForSymbol behavior)
test('context score calculation with test data', () => {
  const result = marketContextService.getMarketContextForSymbol('TEST_SYMBOL_XYZ');
  // Should return empty events array if symbol not in data
  assert.strictEqual(Array.isArray(result.events), true, 'events should be an array');
  assert.strictEqual(Number.isFinite(result.contextScore), true, 'contextScore should be a number');
});

test('market context for TCS (regulatory + official + news)', () => {
  const result = marketContextService.getMarketContextForSymbol('TCS.NS');
  assert.strictEqual(Array.isArray(result.events), true, 'events should be an array');
  
  if (result.events.length > 0) {
    const firstEvent = result.events[0];
    assert.strictEqual(typeof firstEvent.credibilityTier, 'string', 'credibilityTier should be string');
    assert.strictEqual(['regulatory', 'official', 'news', 'community'].includes(firstEvent.credibilityTier), true, 'tier should be valid');
    assert.strictEqual(Number.isFinite(firstEvent.credibilityScore), true, 'credibilityScore should be finite');
    assert.strictEqual(Number.isFinite(firstEvent.ageDays), true, 'ageDays should be finite');
    assert.strictEqual(Number.isFinite(firstEvent.recencyWeight), true, 'recencyWeight should be finite');
    assert.strictEqual(Number.isFinite(firstEvent.weightedImpactScore), true, 'weightedImpactScore should be finite');
  }
  
  assert.strictEqual(Number.isFinite(result.contextScore), true, 'overall contextScore should be finite');
});

test('credibility score ranges', () => {
  const result = marketContextService.getMarketContextForSymbol('RELIANCE.NS');
  
  result.events.forEach((event) => {
    const tierScores = {
      regulatory: 4,
      official: 3,
      news: 2,
      community: 1,
    };
    assertEqual(
      event.credibilityScore,
      tierScores[event.credibilityTier],
      `credibilityScore for tier ${event.credibilityTier}`
    );
  });
});

test('recency weight decays correctly', () => {
  const result = marketContextService.getMarketContextForSymbol('INFY.NS');
  
  result.events.forEach((event) => {
    const weight = event.recencyWeight;
    
    if (event.ageDays <= 3) {
      assertEqual(weight, 1, `weight for ageDays=${event.ageDays} should be 1`);
    } else if (event.ageDays <= 7) {
      assertEqual(weight, 0.8, `weight for ageDays=${event.ageDays} should be 0.8`);
    } else if (event.ageDays <= 14) {
      assertEqual(weight, 0.55, `weight for ageDays=${event.ageDays} should be 0.55`);
    } else {
      assertEqual(weight, 0.3, `weight for ageDays=${event.ageDays} should be 0.3`);
    }
  });
});

test('weighted impact score multiplication', () => {
  const result = marketContextService.getMarketContextForSymbol('TCS.NS');
  
  result.events.forEach((event) => {
    const impactValue = event.impact === 'positive' ? 6 : event.impact === 'negative' ? -6 : 0;
    const expectedWeightedScore = Number((impactValue * event.recencyWeight).toFixed(2));
    assertEqual(
      event.weightedImpactScore,
      expectedWeightedScore,
      `weightedImpactScore for impact=${event.impact}, ageDays=${event.ageDays}`
    );
  });
});

test('context score aggregation includes credibility', () => {
  const result = marketContextService.getMarketContextForSymbol('RELIANCE.NS');
  
  const expected = result.events.reduce(
    (sum, e) => sum + e.weightedImpactScore + e.credibilityScore,
    0
  );
  
  assertCloseTo(result.contextScore, expected, 0.01, 'contextScore should equal sum of weighted impacts + credibility scores');
});

test('return value always has required fields', () => {
  const symbols = ['TCS.NS', 'RELIANCE.NS', 'INFY.NS', 'UNKNOWN.NS'];
  
  symbols.forEach((symbol) => {
    const result = marketContextService.getMarketContextForSymbol(symbol);
    assert.strictEqual(typeof result, 'object', `result should be object for ${symbol}`);
    assert.strictEqual(Array.isArray(result.events), true, `result.events should be array for ${symbol}`);
    assert.strictEqual(Number.isFinite(result.contextScore), true, `result.contextScore should be finite for ${symbol}`);
  });
});

test('handle null/undefined inputs gracefully', () => {
  const result1 = marketContextService.getMarketContextForSymbol(null);
  assert.strictEqual(Array.isArray(result1.events), true, 'null symbol should return object with events array');
  
  const result2 = marketContextService.getMarketContextForSymbol(undefined);
  assert.strictEqual(Array.isArray(result2.events), true, 'undefined symbol should return object with events array');
  
  const result3 = marketContextService.getMarketContextForSymbol('');
  assert.strictEqual(Array.isArray(result3.events), true, 'empty string symbol should return object with events array');
});

test('case insensitivity for symbol lookup', () => {
  const result1 = marketContextService.getMarketContextForSymbol('TCS.NS');
  const result2 = marketContextService.getMarketContextForSymbol('tcs.ns');
  const result3 = marketContextService.getMarketContextForSymbol('TcS.Ns');
  
  assert.strictEqual(result1.events.length, result2.events.length, 'TCS.NS and tcs.ns should return same count');
  assert.strictEqual(result1.events.length, result3.events.length, 'TCS.NS and TcS.Ns should return same count');
});

// Run all tests
console.log('\n📊 Running Market Context Service Tests...\n');

tests.forEach(({ name, fn }) => {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed += 1;
  }
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
