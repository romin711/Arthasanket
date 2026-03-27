import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import ChartCard from '../components/ui/ChartCard';
import { usePortfolio } from '../context/PortfolioContext';

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeHistoricalSeries(item) {
  if (Array.isArray(item?.historical) && item.historical.length) {
    return item.historical
      .map((point) => {
        const open = toFiniteNumber(point?.open);
        const high = toFiniteNumber(point?.high);
        const low = toFiniteNumber(point?.low);
        const close = toFiniteNumber(point?.close);
        const volume = toFiniteNumber(point?.volume);
        const date = String(point?.date || '').slice(0, 10);

        if (!date || close === null) {
          return null;
        }

        return {
          date,
          open,
          high,
          low,
          close,
          volume,
        };
      })
      .filter((point) => point !== null);
  }
  return [];
}

function normalizeConfidence(confidenceValue) {
  const numeric = toFiniteNumber(confidenceValue);
  if (numeric === null) {
    return null;
  }
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
}

function toAction(decisionValue) {
  const action = String(decisionValue || '').trim().toUpperCase();
  return ['BUY', 'HOLD', 'SELL'].includes(action) ? action : 'HOLD';
}

function getDecisionVisual(decision, confidence) {
  const baseClass = 'rounded-2xl border px-4 py-3 font-semibold uppercase tracking-[0.14em]';

  if (decision === 'BUY') {
    return {
      border: `${baseClass} border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-300`,
      stockBorder: 'border-emerald-200',
    };
  }

  if (decision === 'SELL') {
    return {
      border: `${baseClass} border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/25 dark:text-rose-300`,
      stockBorder: 'border-rose-200',
    };
  }

  return {
    border: `${baseClass} border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-300`,
    stockBorder: 'border-amber-200',
  };
}

function formatOptionalCurrency(value, symbol = '') {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return 'Not enough data';
  }

  const currency = 'INR';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatOptionalPercent(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return 'Not enough data';
  }
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`;
}

function ChartsPage() {
  const { analysisData, portfolioRows, realtimeQuotes } = usePortfolio();

  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [showChartSignals, setShowChartSignals] = useState(false);

  const liveResults = useMemo(() => analysisData?.results || [], [analysisData]);
  const hasLiveData = liveResults.length > 0;

  useEffect(() => {
    if (!hasLiveData) {
      setSelectedSymbol('');
      return;
    }
    setSelectedSymbol((previous) => previous || liveResults[0].symbol);
  }, [hasLiveData, liveResults]);

  const selectedResult = useMemo(() => {
    if (!hasLiveData) {
      return null;
    }
    return liveResults.find((item) => item.symbol === selectedSymbol) || liveResults[0];
  }, [hasLiveData, liveResults, selectedSymbol]);

  const weightsBySymbol = useMemo(() => {
    const map = {};
    portfolioRows.forEach((row) => {
      const symbol = String(row.symbol || '').trim().toUpperCase();
      const weight = Number(row.weight);
      if (symbol && !Number.isNaN(weight)) {
        map[symbol] = weight;
      }
    });
    return map;
  }, [portfolioRows]);

  const trackedStocks = useMemo(() => liveResults.map((item) => {
    const latestPrice = toFiniteNumber(realtimeQuotes[item.symbol]?.price ?? item.price ?? item.stock_data?.price);
    const historical = normalizeHistoricalSeries(item);
    const previousClose = historical.length > 1 ? toFiniteNumber(historical[historical.length - 2]?.close) : null;
    const changePercent = latestPrice !== null && previousClose !== null && previousClose !== 0
      ? ((latestPrice - previousClose) / previousClose) * 100
      : null;

    const decision = toAction(item.decision);
    const confidence = normalizeConfidence(item.confidence);
    const weight = Number(weightsBySymbol[item.symbol] || item.weight || 0);

    const stock = {
      symbol: item.symbol,
      priceNumeric: latestPrice,
      price: formatOptionalCurrency(latestPrice, item.symbol),
      changePercent,
      change: formatOptionalPercent(changePercent),
      rsi: toFiniteNumber(item.rsi ?? item.signals?.rsi ?? item.signals?.rsi_14),
      ma20: toFiniteNumber(item.ma20 ?? item.signals?.ma20),
      ma50: toFiniteNumber(item.ma50 ?? item.signals?.ma50),
      decision,
      confidence,
      breakout: item.breakout ?? item.signals?.breakout ?? null,
      finalScore: toFiniteNumber(item.final_score ?? item.finalScore),
      weight,
      historical,
      decisionVisual: getDecisionVisual(decision, confidence),
    };

    return stock;
  }), [liveResults, realtimeQuotes, weightsBySymbol])

  const selectedTracked = useMemo(() => {
    if (!trackedStocks.length) {
      return null;
    }
    return trackedStocks.find((item) => item.symbol === selectedResult?.symbol) || trackedStocks[0];
  }, [trackedStocks, selectedResult]);

  const chartSeries = useMemo(() => {
    if (!selectedTracked) {
      return [];
    }

    return selectedTracked.historical
      .map((point) => ({
        time: String(point.date || '').slice(0, 10),
        open: toFiniteNumber(point.open),
        high: toFiniteNumber(point.high),
        low: toFiniteNumber(point.low),
        close: toFiniteNumber(point.close),
        volume: toFiniteNumber(point.volume),
      }))
      .filter((point) => (
        point.time
        && point.open !== null
        && point.high !== null
        && point.low !== null
        && point.close !== null
      ))
      .sort((left, right) => left.time.localeCompare(right.time));
  }, [selectedTracked]);

  return (
    <div className="space-y-6">
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Price Charts
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            Real-time candlestick charts with technical analysis signals
          </p>
        </div>

        {!hasLiveData ? (
          <Card>
            <div className="py-8 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                No portfolio analysis available. Add stocks and run analysis to view charts.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Select Stock for Chart
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Click a stock card to view its price action chart
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {trackedStocks.map((stock) => {
                  const isSelected = stock.symbol === selectedTracked?.symbol;

                  return (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                        isSelected
                          ? `${stock.decisionVisual.border} ring-2 ring-[#0F766E]`
                          : `${stock.decisionVisual.stockBorder} border bg-white/80 dark:bg-slate-900/60`
                      }`}
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {stock.symbol}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {stock.price}
                        </p>
                        <p className={`text-sm font-semibold ${
                          stock.changePercent !== null && stock.changePercent >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                        >
                          {stock.change}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedTracked && (
              <ChartCard
                title={`${selectedTracked.symbol} Price Action`}
                subtitle="Candles, MA20, MA50 and volume"
                data={chartSeries}
                meta={{
                  symbol: selectedTracked.symbol,
                  decision: selectedTracked.decision,
                  confidence: selectedTracked.confidence,
                  breakout: selectedTracked.breakout,
                  finalScore: selectedTracked.finalScore,
                }}
                showSignals={showChartSignals}
                actions={(
                  <button
                    type="button"
                    onClick={() => setShowChartSignals((previous) => !previous)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${
                      showChartSignals
                        ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/60 dark:bg-blue-900/25 dark:text-blue-300'
                        : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {showChartSignals ? 'Signals On' : 'Signals Off'}
                  </button>
                )}
              />
            )}

            {selectedTracked && (
              <Card>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Technical Metrics
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                        RSI (14)
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {selectedTracked.rsi !== null ? Math.round(selectedTracked.rsi) : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                        MA20
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {selectedTracked.ma20 !== null ? formatOptionalCurrency(selectedTracked.ma20) : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                        MA50
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {selectedTracked.ma50 !== null ? formatOptionalCurrency(selectedTracked.ma50) : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                        Decision
                      </p>
                      <p className={`mt-2 text-lg font-bold ${
                        selectedTracked.decision === 'BUY'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : selectedTracked.decision === 'SELL'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                      }`}
                      >
                        {selectedTracked.decision}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default ChartsPage;
