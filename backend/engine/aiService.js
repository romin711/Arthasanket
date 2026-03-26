function formatIndicatorValue(value, suffix = '') {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return `${value.toFixed(2)}${suffix}`;
}

function isConfiguredGeminiKey(value) {
  const key = String(value || '').trim();
  if (!key) {
    return false;
  }

  const lowered = key.toLowerCase();
  const placeholderPatterns = [
    'your_gemini_api_key_here',
    'replace_me',
    'changeme',
    'example',
  ];

  return !placeholderPatterns.some((pattern) => lowered.includes(pattern));
}

function buildFallbackReasoning(signals, sector, sectorExposure, riskScore, decision) {
  const trend = signals?.trend || 'neutral';
  const rsi = Number.isFinite(signals?.rsi) ? Number(signals.rsi) : null;
  const breakout = signals?.breakout === true ? 'yes' : (signals?.breakout === false ? 'no' : 'n/a');
  const exposureText = Number.isFinite(sectorExposure)
    ? `${sector} exposure ${sectorExposure.toFixed(1)}%`
    : `${sector} exposure n/a`;

  const reason = [
    `Rule-based summary: trend ${trend}, RSI ${rsi === null ? 'n/a' : rsi.toFixed(2)}, breakout ${breakout}.`,
    `Portfolio context: ${exposureText}, risk score ${Number.isFinite(riskScore) ? riskScore : 'n/a'}.`,
  ].join(' ');

  let nextAction = 'Monitor price action and re-evaluate on next daily candle.';
  const normalizedDecision = String(decision || '').toUpperCase();
  if (normalizedDecision.includes('BUY')) {
    nextAction = 'Consider staged buying with a strict stop-loss near recent support.';
  } else if (normalizedDecision.includes('SELL')) {
    nextAction = 'Consider partial or full exit and wait for trend confirmation before re-entry.';
  } else if (rsi !== null && rsi < 30) {
    nextAction = 'Watch for reversal confirmation before adding exposure.';
  }

  return {
    reason,
    next_action: nextAction,
  };
}

function parseAiJson(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/gi, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw _error;
  }
}

async function generateReasoning(signals, sector, sectorExposure, riskScore, finalScore, decision, geminiApiKey) {
  if (!isConfiguredGeminiKey(geminiApiKey)) {
    return buildFallbackReasoning(signals, sector, sectorExposure, riskScore, decision);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
  
  const exposureText = Number.isFinite(sectorExposure)
    ? `${sector} is ${sectorExposure.toFixed(2)}% of portfolio`
    : `${sector} exposure unavailable`;

  const prompt = [
    'You are an investment assistant. Based on:',
    '- technical indicators',
    '- portfolio exposure',
    '- risk score',
    '',
    `Technical indicators: Trend=${signals.trend}, RSI=${formatIndicatorValue(signals.rsi)}, Momentum=${formatIndicatorValue(signals.momentum, '%')}, Breakout=${signals.breakout === null ? 'n/a' : signals.breakout}`,
    `Portfolio exposure: ${exposureText}`,
    `Risk score: ${riskScore}/3`,
    `Final score and decision: ${finalScore} => ${decision}`,
    '',
    'Generate:',
    '- decision reasoning (max 2 lines)',
    '- next action (clear recommendation)',
    '',
    'Be concise and practical.',
    'Respond with raw JSON only: {"reason":"...","next_action":"..."}'
  ].join('\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = parseAiJson(text);

    const reasonText = String(result.reason || 'Analysis complete.')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join('\n');

    return {
      reason: reasonText || 'Analysis complete.',
      next_action: String(result.next_action || 'Follow standard procedure.').trim()
    };
  } catch (error) {
    return buildFallbackReasoning(signals, sector, sectorExposure, riskScore, decision);
  }
}

module.exports = {
  generateReasoning
};
