import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import AlphaPanel from '../components/ui/AlphaPanel';
import ActionCard from '../components/ui/ActionCard';
import { usePortfolio } from '../context/PortfolioContext';

const SAMPLE_RADAR_PORTFOLIO = [
  { symbol: 'TCS', weight: 40 },
  { symbol: 'RELIANCE', weight: 35 },
];

function formatDateTime(value) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

function tierTone(tier) {
  if (tier === 'regulatory') {
    return 'text-emerald-700 dark:text-emerald-300';
  }
  if (tier === 'official') {
    return 'text-blue-700 dark:text-blue-300';
  }
  if (tier === 'news') {
    return 'text-amber-700 dark:text-amber-300';
  }
  return 'text-slate-600 dark:text-slate-300';
}

function formatBacktestRate(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not enough data';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'Not enough data';
  }

  return `${numeric}%`;
}

function formatConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  const normalized = numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
  return `${normalized}%`;
}

function formatPlanPrice(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatPlanPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return `${numeric.toFixed(1)}%`;
}

function formatMetricNumber(value, suffix = '') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return `${numeric.toFixed(1)}${suffix}`;
}

function formatSummary(explanation) {
  const text = String(explanation || '').trim();
  if (!text) {
    return 'No strong signal detected.';
  }

  if (text.toLowerCase().includes('ai reasoning failed')) {
    return 'No strong signal detected.';
  }

  return text;
}

function signalChipsForAlert(alert) {
  const chips = [];

  const trend = String(alert?.trend || '').trim();
  if (trend) {
    chips.push({
      key: `trend-${trend}`,
      label: trend.replace(/^./, (c) => c.toUpperCase()),
      tone: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    });
  }

  const rsi = Number(alert?.rsi);
  if (Number.isFinite(rsi)) {
    chips.push({
      key: `rsi-${rsi}`,
      label: `RSI ${Math.round(rsi)}`,
      tone: 'border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    });
  }

  if (Array.isArray(alert?.riskFlags) && alert.riskFlags.includes('oversold')) {
    chips.push({
      key: 'oversold',
      label: 'Oversold',
      tone: 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    });
  }

  const signalType = String(alert?.signalType || '').trim();
  if (signalType) {
    chips.push({
      key: `signal-${signalType}`,
      label: signalType.replace(/-/g, ' '),
      tone: 'border-teal-300 bg-teal-100 text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    });
  }

  return chips.slice(0, 4);
}

function riskFlagTone(flag) {
  if (flag === 'high-sector-concentration') {
    return 'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
  if (flag === 'oversold') {
    return 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
  if (flag === 'overbought') {
    return 'border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  }
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
}

function OpportunityRadarPage() {
  const {
    opportunityRadarData,
    opportunityRadarHistory,
    fetchOpportunityRadarHistory,
    runOpportunityRadar,
    isRunningOpportunityRadar,
    apiError,
  } = usePortfolio();
  const [actionFilter, setActionFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [credibilityTierFilter, setCredibilityTierFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('priority');
  const [historySortBy, setHistorySortBy] = useState('latest');
  const [selectedRiskProfile, setSelectedRiskProfile] = useState('moderate');

  useEffect(() => {
    fetchOpportunityRadarHistory(30);
  }, [fetchOpportunityRadarHistory]);

  const latestAlerts = useMemo(() => {
    const raw = Array.isArray(opportunityRadarData?.alerts) ? opportunityRadarData.alerts : [];

    const filtered = raw.filter((alert) => {
      const actionOk = actionFilter === 'ALL' || String(alert?.action || '').toUpperCase() === actionFilter;
      const risks = Array.isArray(alert?.riskFlags) ? alert.riskFlags : [];
      const riskOk = riskFilter === 'ALL' || risks.includes(riskFilter);
      
      let tierOk = true;
      if (credibilityTierFilter !== 'ALL') {
        const contextSignals = Array.isArray(alert?.contextSignals) ? alert.contextSignals : [];
        tierOk = contextSignals.some((signal) => String(signal?.credibilityTier || 'community').toUpperCase() === credibilityTierFilter);
      }
      
      return actionOk && riskOk && tierOk;
    });

    const ranked = filtered.slice().sort((left, right) => {
      if (sortBy === 'confidence') {
        return Number(right?.confidence || 0) - Number(left?.confidence || 0);
      }
      if (sortBy === 'strength') {
        return Number(right?.signalStrength || 0) - Number(left?.signalStrength || 0);
      }
      return Number(right?.priorityScore || 0) - Number(left?.priorityScore || 0);
    });

    return ranked;
  }, [actionFilter, credibilityTierFilter, opportunityRadarData, riskFilter, sortBy]);

  const sortedHistory = useMemo(() => {
    const items = Array.isArray(opportunityRadarHistory) ? opportunityRadarHistory : [];
    
    const withAvgPriority = items.map((item) => {
      const alerts = Array.isArray(item?.alerts) ? item.alerts : [];
      const avgPriority = alerts.length > 0
        ? alerts.reduce((sum, alert) => sum + (Number(alert?.priorityScore) || 0), 0) / alerts.length
        : 0;
      return { ...item, avgPriority };
    });

    return withAvgPriority
      .slice()
      .sort((left, right) => {
        if (historySortBy === 'highest-priority') {
          return Number(right.avgPriority || 0) - Number(left.avgPriority || 0);
        }
        return String(right?.generatedAt || '').localeCompare(String(left?.generatedAt || ''));
      });
  }, [historySortBy, opportunityRadarHistory]);

  const topHistoryItems = sortedHistory.slice(0, 10);

  return (
    <div className="space-y-6">
      <Card className="p-6" interactive={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Opportunity Radar</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Autonomous workflow with saved daily runs and source-cited alerts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => runOpportunityRadar(null, { riskProfile: selectedRiskProfile })}
            disabled={isRunningOpportunityRadar}
            className="ripple-btn rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70"
          >
            {isRunningOpportunityRadar ? 'Running Radar...' : 'Run Opportunity Radar'}
          </button>

          <button
            type="button"
            onClick={() => runOpportunityRadar(SAMPLE_RADAR_PORTFOLIO, { riskProfile: selectedRiskProfile })}
            disabled={isRunningOpportunityRadar}
            className="ripple-btn rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Run Sample Radar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Risk Profile</span>
          <select
            value={selectedRiskProfile}
            onChange={(event) => setSelectedRiskProfile(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F766E] dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Active scan profile: {selectedRiskProfile}
          </span>
        </div>

        {opportunityRadarData?.workflow?.length ? (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Latest workflow: {opportunityRadarData.workflow.join(' -> ')}
          </p>
        ) : null}

        {apiError ? <p className="mt-3 text-sm text-[#DC2626]">{apiError}</p> : null}
      </Card>

      <Card className="p-7" interactive={false}>
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Latest Alerts</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Decision-first layout for faster scanning</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F766E] dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="ALL">All Actions</option>
            <option value="BUY">BUY</option>
            <option value="HOLD">HOLD</option>
            <option value="SELL">SELL</option>
          </select>

          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F766E] dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="ALL">All Risk Flags</option>
            <option value="high-sector-concentration">High Sector Concentration</option>
            <option value="oversold">Oversold</option>
            <option value="overbought">Overbought</option>
          </select>

          <select
            value={credibilityTierFilter}
            onChange={(event) => setCredibilityTierFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F766E] dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="ALL">All Credibility Tiers</option>
            <option value="REGULATORY">Regulatory</option>
            <option value="OFFICIAL">Official</option>
            <option value="NEWS">News</option>
            <option value="COMMUNITY">Community</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F766E] dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="priority">Sort: Priority Score</option>
            <option value="confidence">Sort: Confidence</option>
            <option value="strength">Sort: Signal Strength</option>
          </select>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {latestAlerts.length ? latestAlerts.map((alert) => (
            <article
              key={`${alert.symbol}-${alert.signalType}-${alert.action}`}
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
                  <p className="mt-1 text-3xl font-bold leading-none text-slate-900 dark:text-slate-100">{formatConfidence(alert.confidence)}</p>
                </div>
              </div>

              {Array.isArray(alert.riskFlags) && alert.riskFlags.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {alert.riskFlags.map((flag) => (
                    <span
                      key={`${alert.symbol}-${flag}`}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskFlagTone(flag)}`}
                    >
                      {flag.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {signalChipsForAlert(alert).map((chip) => (
                  <span
                    key={chip.key}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${chip.tone}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>

              <p className="mt-4 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                {formatSummary(alert.explanation)}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Priority {alert.priorityScore ?? 'NA'}</span>
                <span>Signal {alert.signalStrength ?? 'NA'}</span>
                <span>Backtest {formatBacktestRate(alert.backtestedSuccessRate)}</span>
                <span>Profile {String(alert.riskProfile || opportunityRadarData?.riskProfile || 'moderate').toUpperCase()}</span>
              </div>

              {alert.backtestStats && <AlphaPanel signal={alert} backtestStats={alert.backtestStats} />}
              {alert.executionPlan && <ActionCard alert={alert} tradePlan={{ decision: alert.action, entryLow: alert.executionPlan?.entryRangeLow, entryHigh: alert.executionPlan?.entryRangeHigh, stopLoss: alert.executionPlan?.stopLoss, target1: alert.executionPlan?.targetPrice, target2: alert.executionPlan?.targetPrice ? alert.executionPlan.targetPrice * 1.02 : null, timeHorizon: alert.executionPlan?.timeHorizonDays || 5, positionSize: (alert.executionPlan?.suggestedPositionSizePct || 0) / 100, rationale: alert.executionPlan?.rationale, watchOnly: alert.executionPlan?.watchOnly, executable: alert.executionPlan?.executable }} />}

              <details className="mt-4 rounded-xl border border-slate-200 bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/55">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100">
                  View Details
                </summary>

                {alert.executionPlan ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-800/60 dark:bg-emerald-900/20">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                      Action Plan
                    </p>
                    {alert.executionPlan.watchOnly ? (
                      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Watch-only plan: wait for confirmation before placing orders.</p>
                    ) : null}
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-200">
                      <span>Entry</span>
                      <span className="text-right">{formatPlanPrice(alert.executionPlan.entryPrice)}</span>
                      <span>Range</span>
                      <span className="text-right">
                        {formatPlanPrice(alert.executionPlan.entryRangeLow)} - {formatPlanPrice(alert.executionPlan.entryRangeHigh)}
                      </span>
                      <span>Stop</span>
                      <span className="text-right">{formatPlanPrice(alert.executionPlan.stopLoss)}</span>
                      <span>Target</span>
                      <span className="text-right">{formatPlanPrice(alert.executionPlan.targetPrice)}</span>
                      <span>Size</span>
                      <span className="text-right">{formatPlanPercent(alert.executionPlan.suggestedPositionSizePct)}</span>
                      <span>Horizon</span>
                      <span className="text-right">{alert.executionPlan.timeHorizonDays || '--'} days</span>
                    </div>
                    {alert.executionPlan.rationale ? (
                      <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300">{alert.executionPlan.rationale}</p>
                    ) : null}
                  </div>
                ) : null}

                {alert.portfolioRelevance ? (
                  <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">{alert.portfolioRelevance}</p>
                ) : null}

                {Array.isArray(alert.contextSignals) && alert.contextSignals.length ? (
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Context Signals</p>
                    {alert.contextSignals.map((event, idx) => (
                      <p key={`${event.type}-${idx}`}>
                        [{String(event.impact || 'neutral').toUpperCase()}] {event.title}
                        {' '}({event.source})
                        {' '}
                        <span className={tierTone(event.credibilityTier)}>
                          [{String(event.credibilityTier || 'community').toUpperCase()}]
                        </span>
                        {' '}
                        <span>
                          [D{Number.isFinite(Number(event.ageDays)) ? Number(event.ageDays) : 'NA'}]
                        </span>
                        {event.sourceUrl ? (
                          <>
                            {' '}
                            <a
                              href={event.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 underline dark:text-emerald-300"
                            >
                              source
                            </a>
                          </>
                        ) : null}
                      </p>
                    ))}
                  </div>
                ) : null}

                {Array.isArray(alert.sources) && alert.sources.length ? (
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Sources: {alert.sources.join(' | ')}
                  </p>
                ) : null}
              </details>
            </article>
          )) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No latest alerts yet. Run Opportunity Radar to generate alerts.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6" interactive={false}>
        <h3 className="text-lg font-semibold">Alpha Evidence</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Quality proxy metrics from current autonomous scan.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Signals</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{opportunityRadarData?.alphaEvidence?.totalSignals ?? '--'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Actionable</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{opportunityRadarData?.alphaEvidence?.actionableSignals ?? '--'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Avg Backtest</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMetricNumber(opportunityRadarData?.alphaEvidence?.avgBacktestedSuccessRate, '%')}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Edge Score</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatMetricNumber(opportunityRadarData?.alphaEvidence?.estimatedEdgeScore)}
            </p>
          </div>
        </div>

        {Array.isArray(opportunityRadarData?.alphaEvidence?.signalTypeStats)
          && opportunityRadarData.alphaEvidence.signalTypeStats.length ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70">
              <p className="mb-2 font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Signal Type Breakdown</p>
              <div className="space-y-1.5">
                {opportunityRadarData.alphaEvidence.signalTypeStats.slice(0, 5).map((row) => (
                  <div key={row.signalType} className="grid grid-cols-4 gap-2 text-slate-700 dark:text-slate-200">
                    <span className="capitalize">{String(row.signalType || '').replace(/-/g, ' ')}</span>
                    <span>Count {row.count}</span>
                    <span>Conf {formatMetricNumber(row.avgConfidence, '%')}</span>
                    <span>Backtest {formatMetricNumber(row.avgBacktestedSuccessRate, '%')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
      </Card>

      <Card className="p-6" interactive={false}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Radar Runs</h3>
          <select
            value={historySortBy}
            onChange={(event) => setHistorySortBy(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F766E] dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="latest">Latest Runs</option>
            <option value="highest-priority">Highest Avg Priority</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {topHistoryItems.length ? topHistoryItems.map((item, index) => (
            <div key={`${item.generatedAt || 'unknown'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/70">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Run at {formatDateTime(item.generatedAt)}
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                Alerts: {Array.isArray(item.alerts) ? item.alerts.length : 0}
                {' '}| Portfolio rows: {Array.isArray(item.portfolioRows) ? item.portfolioRows.length : 0}
                {' '}| Avg Priority: {Number.isFinite(item.avgPriority) ? item.avgPriority.toFixed(2) : 'NA'}
              </p>
              {item?.portfolioInsight ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.portfolioInsight}</p>
              ) : null}
            </div>
          )) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No history yet. Your radar runs will appear here after the first scan.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default OpportunityRadarPage;
