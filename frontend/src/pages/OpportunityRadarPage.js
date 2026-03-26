import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
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
            onClick={() => runOpportunityRadar()}
            disabled={isRunningOpportunityRadar}
            className="ripple-btn rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-xl disabled:opacity-70"
          >
            {isRunningOpportunityRadar ? 'Running Radar...' : 'Run Opportunity Radar'}
          </button>

          <button
            type="button"
            onClick={() => runOpportunityRadar(SAMPLE_RADAR_PORTFOLIO)}
            disabled={isRunningOpportunityRadar}
            className="ripple-btn rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-xl disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Run Sample Radar
          </button>
        </div>

        {opportunityRadarData?.workflow?.length ? (
          <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
            Latest workflow: {opportunityRadarData.workflow.join(' -> ')}
          </p>
        ) : null}

        {apiError ? <p className="mt-3 text-sm text-[#DC2626]">{apiError}</p> : null}
      </Card>

      <Card className="p-6" interactive={false}>
        <h3 className="text-lg font-semibold">Latest Alerts</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="ALL">All Actions</option>
            <option value="BUY">BUY</option>
            <option value="HOLD">HOLD</option>
            <option value="SELL">SELL</option>
          </select>

          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="ALL">All Risk Flags</option>
            <option value="high-sector-concentration">High Sector Concentration</option>
            <option value="oversold">Oversold</option>
            <option value="overbought">Overbought</option>
          </select>

          <select
            value={credibilityTierFilter}
            onChange={(event) => setCredibilityTierFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="priority">Sort: Priority Score</option>
            <option value="confidence">Sort: Confidence</option>
            <option value="strength">Sort: Signal Strength</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {latestAlerts.length ? latestAlerts.map((alert) => (
            <div key={`${alert.symbol}-${alert.signalType}-${alert.action}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {alert.symbol}: {alert.action} ({alert.signalType})
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{alert.explanation}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Priority {alert.priorityScore ?? 'NA'} |
                {' '}
                Strength {alert.signalStrength ?? 'NA'} | Confidence {alert.confidence ?? 'NA'}%
                {' '}| Backtest {alert.backtestedSuccessRate ?? 'NA'}
              </p>
              {alert.portfolioRelevance ? (
                <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">{alert.portfolioRelevance}</p>
              ) : null}

              {Array.isArray(alert.contextSignals) && alert.contextSignals.length ? (
                <div className="mt-2 space-y-1 rounded-lg bg-white/60 p-2 text-xs text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
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
                            className="text-indigo-700 underline dark:text-indigo-300"
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
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Sources: {alert.sources.join(' | ')}</p>
              ) : null}
            </div>
          )) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No latest alerts yet. Run Opportunity Radar to generate alerts.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6" interactive={false}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Radar Runs</h3>
          <select
            value={historySortBy}
            onChange={(event) => setHistorySortBy(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="latest">Latest Runs</option>
            <option value="highest-priority">Highest Avg Priority</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {topHistoryItems.length ? topHistoryItems.map((item, index) => (
            <div key={`${item.generatedAt || 'unknown'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Run at {formatDateTime(item.generatedAt)}
              </p>
              <p className="mt-1 text-gray-600 dark:text-slate-300">
                Alerts: {Array.isArray(item.alerts) ? item.alerts.length : 0}
                {' '}| Portfolio rows: {Array.isArray(item.portfolioRows) ? item.portfolioRows.length : 0}
                {' '}| Avg Priority: {Number.isFinite(item.avgPriority) ? item.avgPriority.toFixed(2) : 'NA'}
              </p>
              {item?.portfolioInsight ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{item.portfolioInsight}</p>
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
