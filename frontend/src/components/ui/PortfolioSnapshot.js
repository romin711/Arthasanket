import React from 'react';

function PortfolioSnapshot({ portfolioValue, dailyPnL, dailyPnLPercent, cashReserve, lastUpdated, onRefresh, isRefreshing }) {
  const isPnLPositive = !String(dailyPnL || '').startsWith('-');

  return (
    <div className="space-y-4">
      {/* Portfolio Value Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
          Portfolio Value
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {portfolioValue}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-slate-400">Today's PnL</p>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold
            ${isPnLPositive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
            }`}
          >
            <span>{dailyPnL}</span>
            <span className="text-xs">({dailyPnLPercent})</span>
          </span>
        </div>
      </div>

      {/* Cash Available Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
          Cash Available
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {cashReserve}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Ready for trades
        </p>
      </div>

      {/* Refresh Button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="ripple-btn w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 ease-in-out hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        {isRefreshing ? 'Updating...' : 'Refresh Data'}
      </button>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-center text-gray-500 dark:text-slate-400">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default PortfolioSnapshot;
