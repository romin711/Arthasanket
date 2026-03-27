import React from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { usePortfolio } from '../context/PortfolioContext';

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeConfidence(confidenceValue) {
  const numeric = toFiniteNumber(confidenceValue);
  if (numeric === null) {
    return null;
  }
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
}

function formatDecisionSummary(text) {
  const message = String(text || '').trim();
  if (!message || message.toLowerCase().includes('ai reasoning failed')) {
    return 'No strong signal detected.';
  }
  return message;
}

function formatBacktest(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'Not enough data';
  }
  return `${numeric}%`;
}

function signalBadgeSet(alert) {
  const badges = [];
  const trend = String(alert?.trend || '').trim();
  if (trend) {
    badges.push({
      key: `trend-${trend}`,
      label: trend.replace(/^./, (c) => c.toUpperCase()),
      tone: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    });
  }

  const rsi = Number(alert?.rsi);
  if (Number.isFinite(rsi)) {
    badges.push({
      key: `rsi-${rsi}`,
      label: `RSI ${Math.round(rsi)}`,
      tone: 'border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    });
  }

  if (Array.isArray(alert?.riskFlags) && alert.riskFlags.includes('oversold')) {
    badges.push({
      key: 'oversold',
      label: 'Oversold',
      tone: 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    });
  }

  const signalType = String(alert?.signalType || '').trim();
  if (signalType) {
    badges.push({
      key: `signal-${signalType}`,
      label: signalType.replace(/-/g, ' '),
      tone: 'border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    });
  }

  return badges.slice(0, 4);
}

function riskTone(flag) {
  if (flag === 'high-sector-concentration') {
    return 'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
  if (flag === 'oversold') {
    return 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
}

function trendArrow(trend) {
  if (String(trend).toLowerCase() === 'uptrend') {
    return '↑';
  }
  if (String(trend).toLowerCase() === 'downtrend') {
    return '↓';
  }
  return '→';
}

function InsightsPage() {
  const { analysisData, opportunityRadarData, isRunningOpportunityRadar } = usePortfolio();
  const results = analysisData?.results || [];
  const radarAlerts = opportunityRadarData?.alerts || [];

  const highlights = results.map((item) => {
    const symbol = item?.symbol || 'Unknown';
    const decision = String(item?.decision || 'HOLD').toUpperCase();
    const trend = item?.trend || item?.signals?.trend || 'neutral';
    const rsi = toFiniteNumber(item?.rsi);
    return {
      symbol,
      decision,
      trend,
      rsiText: rsi === null ? '--' : Math.round(rsi),
      arrow: trendArrow(trend),
    };
  });

  return (
    <div className="space-y-6">
      <Card className="p-7" interactive={false}>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Opportunity Radar Alerts</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Decision-first alert board</p>

        {opportunityRadarData?.workflow?.length ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Workflow: {opportunityRadarData.workflow.join(' -> ')}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {radarAlerts.length ? radarAlerts.map((alert) => (
            <article
              key={`${alert.symbol}-${alert.signalType}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{alert.symbol}</p>
                  <div className="mt-2">
                    <Badge action={alert.action || 'HOLD'} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Confidence</p>
                  <p className="mt-1 text-3xl font-bold leading-none text-slate-900 dark:text-slate-100">
                    {normalizeConfidence(alert.confidence) ?? '--'}%
                  </p>
                </div>
              </div>

              {Array.isArray(alert.riskFlags) && alert.riskFlags.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {alert.riskFlags.map((flag) => (
                    <span key={`${alert.symbol}-${flag}`} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskTone(flag)}`}>
                      {flag.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {signalBadgeSet(alert).map((badge) => (
                  <span key={badge.key} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${badge.tone}`}>
                    {badge.label}
                  </span>
                ))}
              </div>

              <p className="mt-4 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                {formatDecisionSummary(alert.explanation)}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Signal {alert.signalStrength ?? 'NA'}</span>
                <span>Backtest {formatBacktest(alert.backtestedSuccessRate)}</span>
              </div>

              <details className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/55">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
                  View Details
                </summary>
                {Array.isArray(alert.sources) && alert.sources.length ? (
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Sources: {alert.sources.join(' | ')}</p>
                ) : null}
              </details>
            </article>
          )) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {isRunningOpportunityRadar
                ? 'Running opportunity radar...'
                : 'No opportunity alerts yet. Click Run AI Scan to generate autonomous alerts.'}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-7" interactive={false}>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Market Intelligence Brief</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Compact view for rapid scan</p>

        <div className="mt-5 space-y-2">
          {highlights.length ? highlights.map((item) => (
            <div key={`${item.symbol}-${item.decision}`} className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.3fr] items-center rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-700 transition-all duration-200 ease-out hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.symbol}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{item.decision}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">RSI {item.rsiText}</span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{item.arrow}</span>
            </div>
          )) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No insights yet. Run an analysis from Portfolio Workspace to populate this page.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6" interactive={false}>
        <h3 className="text-lg font-semibold">Indicator Notes</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>MA20 and MA50 are computed manually from daily closes.</p>
          <p>RSI uses a 14-period gain/loss calculation.</p>
          <p>Confidence combines MA50 distance and RSI strength.</p>
        </div>
      </Card>
    </div>
  );
}

export default InsightsPage;
