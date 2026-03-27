import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { usePortfolio } from '../context/PortfolioContext';

function buildCurvePoints(curve = [], key = 'strategy') {
  const rows = Array.isArray(curve) ? curve : [];
  if (rows.length === 0) return '';

  const values = rows.map((item) => Number(item?.[key])).filter((value) => Number.isFinite(value));
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);

  return rows
    .map((item, idx) => {
      const x = rows.length === 1 ? 0 : (idx / (rows.length - 1)) * 100;
      const value = Number(item?.[key]);
      const normalized = Number.isFinite(value) ? (value - min) / span : 0;
      const y = 100 - (normalized * 100);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * ValidationDashboard
 * Displays cumulative signal performance and validation evidence
 * Shows: hit rates, risk-adjusted returns, drawdown analysis
 */
function ValidationDashboard() {
  const { opportunityRadarHistory } = usePortfolio();
  const [validationMetrics, setValidationMetrics] = useState(null);
  const [performanceByDecision, setPerformanceByDecision] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:3001';
  const fallbackApiBase = apiBase.includes('127.0.0.1')
    ? apiBase.replace('127.0.0.1', 'localhost')
    : apiBase.replace('localhost', '127.0.0.1');

  useEffect(() => {
    let active = true;

    const fetchValidation = async () => {
      setIsLoading(true);
      setError('');

      const bases = [apiBase, fallbackApiBase];

      for (const base of bases) {
        try {
          const perfResponse = await fetch(`${base}/api/validation/performance`);
          if (!perfResponse.ok) {
            throw new Error(`Validation API error (${perfResponse.status})`);
          }

          const perfData = await perfResponse.json();
          let breakdown = perfData?.strategyByDecision;

          if (!breakdown) {
            const breakdownResponse = await fetch(`${base}/api/validation/strategy-breakdown`);
            if (breakdownResponse.ok) {
              breakdown = await breakdownResponse.json();
            }
          }

          if (active) {
            setValidationMetrics(perfData);
            setPerformanceByDecision(breakdown || {});
            setIsLoading(false);
          }
          return;
        } catch (_err) {
          // Try next host alias
        }
      }

      if (active) {
        setError('Unable to load validation metrics from backend. Start backend and retry.');
        setIsLoading(false);
      }
    };

    fetchValidation();

    return () => {
      active = false;
    };
  }, [apiBase, fallbackApiBase]);

  const allAlerts = useMemo(() => {
    const hist = Array.isArray(opportunityRadarHistory) ? opportunityRadarHistory : [];
    return hist.flatMap((run) => Array.isArray(run.alerts) ? run.alerts : []);
  }, [opportunityRadarHistory]);

  const decisionBreakdown = useMemo(() => {
    const breakdown = { BUY: 0, SELL: 0, HOLD: 0, NEUTRAL: 0 };
    allAlerts.forEach((alert) => {
      const action = String(alert.action || 'NEUTRAL').toUpperCase();
      breakdown[action] = (breakdown[action] || 0) + 1;
    });
    return breakdown;
  }, [allAlerts]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card interactive={false} className="p-6">
          <p className="text-center text-slate-500">Loading validation metrics...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card interactive={false} className="p-6">
          <p className="text-center text-sm text-rose-600">{error}</p>
        </Card>
      </div>
    );
  }

  const hitRateCI95 = validationMetrics?.hitRateCI95 || [0, 0];
  const fiveDayAttribution = validationMetrics?.returnAttribution?.['5D'] || { mean: 0, ci95: [0, 0] };
  const baseline = validationMetrics?.baselineComparison || {
    baselineAnnualReturn: 0,
    outperformanceRatio: 0,
    description: 'No baseline data',
    baselineCompoundedReturnPct: 0,
    strategyCompoundedReturnPct: 0,
    outperformancePct: 0,
  };
  const equityCurve = Array.isArray(validationMetrics?.equityCurve) ? validationMetrics.equityCurve : [];
  const strategyCurvePoints = buildCurvePoints(equityCurve, 'strategy');
  const baselineCurvePoints = buildCurvePoints(equityCurve, 'baseline');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card interactive={false} className="p-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Validation Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Cumulative signal performance & statistical evidence of alpha generation
          </p>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Cumulative Return */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Avg Strategy Return (5D)
            </p>
            <p className={`mt-2 text-3xl font-bold ${fiveDayAttribution.mean >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {fiveDayAttribution.mean >= 0 ? '+' : ''}{Number(fiveDayAttribution.mean || 0).toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              95% CI: {Number(fiveDayAttribution?.ci95?.[0] || 0).toFixed(2)}% to {Number(fiveDayAttribution?.ci95?.[1] || 0).toFixed(2)}%
            </p>
          </div>

          {/* Hit Rate */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Hit Rate
            </p>
            <p className={`mt-2 text-3xl font-bold ${validationMetrics.hitRate >= 0.55 ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
              {(validationMetrics.hitRate * 100).toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              95% CI: {(hitRateCI95[0] * 100).toFixed(1)}% to {(hitRateCI95[1] * 100).toFixed(1)}%
            </p>
          </div>

          {/* Sharpe Ratio */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Sharpe Ratio
            </p>
            <p className={`mt-2 text-3xl font-bold ${validationMetrics.sharpeRatio >= 1 ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
              {validationMetrics.sharpeRatio.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Risk-adjusted return</p>
          </div>

          {/* Max Drawdown */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Max Drawdown
            </p>
            <p className="mt-2 text-3xl font-bold text-rose-600">
              {Math.abs(validationMetrics.maxDrawdown * 100).toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Peak-to-trough loss</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Live realized outcomes tracked: {Number(validationMetrics.liveOutcomeCount || 0)}
        </div>
      </Card>

      {/* Equity Curve */}
      <Card interactive={false} className="p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Cumulative Equity Curve</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Strategy vs baseline compounding over validated signal windows
        </p>

        {equityCurve.length > 1 ? (
          <div className="mt-5">
            <div className="h-64 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none" aria-label="equity curve chart">
                <polyline
                  points={baselineCurvePoints}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />
                <polyline
                  points={strategyCurvePoints}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.4"
                />
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-5 rounded bg-emerald-600" /> Strategy
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-5 rounded bg-slate-500" /> Baseline
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Not enough resolved outcomes to plot an equity curve yet.
          </p>
        )}
      </Card>

      {/* Baseline Comparison */}
      <Card interactive={false} className="p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Performance vs Baseline</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Comparison against buy-and-hold strategy
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Baseline Return */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Baseline (Buy & Hold)
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {baseline.baselineAnnualReturn}%
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Expected annual return</p>
          </div>

          {/* Outperformance */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
              Outperformance
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {baseline.outperformancePct >= 0 ? '+' : ''}{Number(baseline.outperformancePct || 0).toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              {baseline.description}
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              Strategy: {Number(baseline.strategyCompoundedReturnPct || 0).toFixed(2)}% | Baseline: {Number(baseline.baselineCompoundedReturnPct || 0).toFixed(2)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Performance by Decision Type */}
      <Card interactive={false} className="p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Performance by Signal Type</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Detailed metrics for each recommendation type
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {Object.entries(performanceByDecision).map(([decision, metrics]) => (
            <div
              key={decision}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{decision}</h3>
                <Badge action={decision} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Hit Rate</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {(metrics.hitRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Hit Rate CI95</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {(Number(metrics?.hitRateCI95?.[0] || 0) * 100).toFixed(1)}% to {(Number(metrics?.hitRateCI95?.[1] || 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Return Attribution</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    1D {Number(metrics?.returnAttribution?.['1D']?.mean || 0).toFixed(2)}% | 3D {Number(metrics?.returnAttribution?.['3D']?.mean || 0).toFixed(2)}% | 5D {Number(metrics?.returnAttribution?.['5D']?.mean || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Sample Size</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">n={metrics.sampleSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Worst Drawdown</span>
                  <span className="font-semibold text-rose-600">
                    {Math.abs(Number(metrics?.worstDrawdown || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Confidence</span>
                  <Badge action={metrics.confidence} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Decision Distribution */}
      <Card interactive={false} className="p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Alert Distribution</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Recommendation breakdown across all historical runs
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Object.entries(decisionBreakdown).map(([decision, count]) => (
            <div
              key={decision}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/40"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{decision}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {((count / (Math.max(validationMetrics.signalCount, allAlerts.length) || 1)) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Statistical Confidence */}
      <Card interactive={false} className="p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Statistical Summary</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Evidence of alpha and significance testing
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">✅ Positive Alpha Detected</p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              5D strategy return ({Number(fiveDayAttribution.mean || 0).toFixed(2)}%) with CI [{Number(fiveDayAttribution?.ci95?.[0] || 0).toFixed(2)}%, {Number(fiveDayAttribution?.ci95?.[1] || 0).toFixed(2)}%].
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-900/20">
            <p className="font-semibold text-blue-700 dark:text-blue-300">📊 Sample Size Adequate</p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              {validationMetrics.signalCount} backtest signals analyzed ({validationMetrics.alertSampleCount || 0} live alerts tracked). Hit rate CI95: {(hitRateCI95[0] * 100).toFixed(1)}% to {(hitRateCI95[1] * 100).toFixed(1)}%.
            </p>
          </div>

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-900/40 dark:bg-violet-900/20">
            <p className="font-semibold text-violet-700 dark:text-violet-300">📈 Risk-Adjusted Performance</p>
            <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
              Sharpe ratio of {validationMetrics.sharpeRatio.toFixed(2)} indicates {validationMetrics.sharpeRatio >= 1.3 ? 'excellent' : 'good'} risk-adjusted
              returns. Maximum drawdown: {Math.abs(validationMetrics.maxDrawdown * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Methodology Note */}
      <Card interactive={false} className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">Methodology</h2>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Metrics are computed from stored signal outcomes with direction-aware scoring: BUY succeeds on positive returns,
          SELL succeeds on negative returns, and HOLD succeeds in low-volatility ranges. Return attribution is tracked at
          1D/3D/5D horizons. Confidence intervals use Wilson score for hit rates and normal approximation for returns.
          Baseline uses a 3% annual buy-and-hold assumption converted to 5-day windows.
        </p>
      </Card>
    </div>
  );
}

export default ValidationDashboard;
