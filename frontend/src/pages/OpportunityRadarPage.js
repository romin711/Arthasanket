import React, { useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import { usePortfolio } from '../context/PortfolioContext';

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

function OpportunityRadarPage() {
  const {
    opportunityRadarData,
    opportunityRadarHistory,
    fetchOpportunityRadarHistory,
    runOpportunityRadar,
    isRunningOpportunityRadar,
    apiError,
  } = usePortfolio();

  useEffect(() => {
    fetchOpportunityRadarHistory(30);
  }, [fetchOpportunityRadarHistory]);

  const latestAlerts = useMemo(() => opportunityRadarData?.alerts || [], [opportunityRadarData]);

  const sortedHistory = useMemo(() => {
    const items = Array.isArray(opportunityRadarHistory) ? opportunityRadarHistory : [];
    return items
      .slice()
      .sort((left, right) => String(right?.generatedAt || '').localeCompare(String(left?.generatedAt || '')));
  }, [opportunityRadarHistory]);

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
        <div className="mt-4 space-y-3">
          {latestAlerts.length ? latestAlerts.map((alert) => (
            <div key={`${alert.symbol}-${alert.signalType}-${alert.action}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {alert.symbol}: {alert.action} ({alert.signalType})
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{alert.explanation}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Strength {alert.signalStrength ?? 'NA'} | Confidence {alert.confidence ?? 'NA'}%
                {' '}| Backtest {alert.backtestedSuccessRate ?? 'NA'}
              </p>
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
        <h3 className="text-lg font-semibold">Recent Radar Runs</h3>
        <div className="mt-4 space-y-3">
          {topHistoryItems.length ? topHistoryItems.map((item, index) => (
            <div key={`${item.generatedAt || 'unknown'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Run at {formatDateTime(item.generatedAt)}
              </p>
              <p className="mt-1 text-gray-600 dark:text-slate-300">
                Alerts: {Array.isArray(item.alerts) ? item.alerts.length : 0}
                {' '}| Portfolio rows: {Array.isArray(item.portfolioRows) ? item.portfolioRows.length : 0}
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
