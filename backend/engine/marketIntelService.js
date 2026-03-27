const { fetchYahooStockData } = require('./yahooClient');
const { detectSector } = require('./portfolioService');

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatPercent(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return 'n/a';
  }
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`;
}

function scoreAlertTrend(alert) {
  const action = String(alert?.action || 'HOLD').toUpperCase();
  const trend = String(alert?.trend || '').toLowerCase();
  let score = 0;

  if (action === 'BUY') score += 1;
  if (action === 'SELL') score -= 1;
  if (trend === 'uptrend') score += 1;
  if (trend === 'downtrend') score -= 1;

  return score;
}

function deriveSectorTrendFromRuns(historyRuns = []) {
  const sectorScores = new Map();

  historyRuns.forEach((run) => {
    const alerts = Array.isArray(run?.alerts) ? run.alerts : [];
    alerts.forEach((alert) => {
      const symbol = String(alert?.resolvedSymbol || alert?.symbol || '').trim().toUpperCase();
      if (!symbol) {
        return;
      }

      const sector = detectSector(symbol);
      const current = sectorScores.get(sector) || 0;
      sectorScores.set(sector, current + scoreAlertTrend(alert));
    });
  });

  const ranked = Array.from(sectorScores.entries())
    .map(([sector, score]) => ({ sector, score }))
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) {
    return {
      summary: 'Sector rotation mixed with no dominant theme.',
      strongest: null,
      weakest: null,
    };
  }

  const strongest = ranked.find((item) => item.score > 0) || null;
  const weakest = ranked.slice().reverse().find((item) => item.score < 0) || null;

  if (strongest && weakest) {
    return {
      summary: `${strongest.sector} strong, ${weakest.sector} weak.`,
      strongest,
      weakest,
    };
  }

  if (strongest) {
    return {
      summary: `${strongest.sector} leading while others remain mixed.`,
      strongest,
      weakest: null,
    };
  }

  return {
    summary: `${ranked[ranked.length - 1].sector} under pressure while broader market is mixed.`,
    strongest: null,
    weakest: ranked[ranked.length - 1],
  };
}

function oneLineMarketSummary(niftyChange, sensexChange, sectorSummary) {
  const avg = ((toFiniteNumber(niftyChange) || 0) + (toFiniteNumber(sensexChange) || 0)) / 2;

  if (avg > 0.7) {
    return `Risk-on session with broad strength. ${sectorSummary}`;
  }
  if (avg < -0.7) {
    return `Risk-off session with broad weakness. ${sectorSummary}`;
  }
  return `Range-bound session with selective moves. ${sectorSummary}`;
}

function inferNewsBias(headline) {
  const text = String(headline || '').toLowerCase();
  const bullishKeywords = ['surge', 'beats', 'up', 'gain', 'rally', 'approval', 'upgrade', 'profit rises'];
  const bearishKeywords = ['falls', 'down', 'slump', 'miss', 'warning', 'downgrade', 'cuts', 'selloff'];

  if (bullishKeywords.some((keyword) => text.includes(keyword))) {
    return 'Bullish';
  }
  if (bearishKeywords.some((keyword) => text.includes(keyword))) {
    return 'Bearish';
  }
  return 'Neutral';
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRssItems(xmlText = '') {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const block = match[1] || '';
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = stripHtml(titleMatch?.[1] || '');
    const link = stripHtml(linkMatch?.[1] || '');
    const publishedAt = stripHtml(pubDateMatch?.[1] || '');

    if (!title) {
      continue;
    }

    items.push({
      headline: title,
      url: link,
      publishedAt,
      bias: inferNewsBias(title),
    });
  }

  return items;
}

async function fetchFinancialNews(limit = 5) {
  const sources = [
    {
      name: 'Economic Times Markets',
      url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    },
    {
      name: 'Yahoo Finance',
      url: 'https://finance.yahoo.com/news/rssindex',
    },
  ];

  const all = [];

  await Promise.all(sources.map(async (source) => {
    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        return;
      }

      const xml = await response.text();
      const items = parseRssItems(xml).map((item) => ({
        ...item,
        source: source.name,
      }));
      all.push(...items);
    } catch (_error) {
      // Skip unavailable source and continue.
    }
  }));

  const deduped = [];
  const seen = new Set();
  all.forEach((item) => {
    const key = String(item.headline || '').toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(item);
  });

  return deduped.slice(0, Math.max(1, Math.min(20, Number(limit) || 5)));
}

async function getMarketSummary(historyRuns = []) {
  const [niftyData, sensexData] = await Promise.all([
    fetchYahooStockData('^NSEI').catch(() => null),
    fetchYahooStockData('^BSESN').catch(() => null),
  ]);

  function computeIndexMove(data) {
    if (!data?.historical || data.historical.length < 2) {
      return {
        current: null,
        previous: null,
        changePercent: null,
      };
    }

    const latest = data.historical[data.historical.length - 1];
    const prev = data.historical[data.historical.length - 2];
    const current = toFiniteNumber(latest?.close);
    const previous = toFiniteNumber(prev?.close);

    if (current === null || previous === null || previous === 0) {
      return {
        current,
        previous,
        changePercent: null,
      };
    }

    return {
      current,
      previous,
      changePercent: ((current - previous) / previous) * 100,
    };
  }

  const nifty = computeIndexMove(niftyData);
  const sensex = computeIndexMove(sensexData);
  const sectorTrend = deriveSectorTrendFromRuns(historyRuns);

  return {
    nifty: {
      name: 'NIFTY 50',
      value: nifty.current,
      movement: formatPercent(nifty.changePercent),
      changePercent: nifty.changePercent,
    },
    sensex: {
      name: 'SENSEX',
      value: sensex.current,
      movement: formatPercent(sensex.changePercent),
      changePercent: sensex.changePercent,
    },
    sectorTrend,
    summaryLine: oneLineMarketSummary(nifty.changePercent, sensex.changePercent, sectorTrend.summary),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getMarketSummary,
  fetchFinancialNews,
};