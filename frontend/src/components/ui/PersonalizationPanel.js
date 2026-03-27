import React, { useState } from 'react';

/**
 * PersonalizationPanel: User policy controls that affect signal filtering and recommendations
 * Live toggle demo: change policies and watch recommendations update in real-time
 */
function PersonalizationPanel({ policies, onChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePolicyChange = (policyKey, value) => {
    onChange({
      ...policies,
      [policyKey]: value,
    });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Portfolio Personalization
        </h3>
        <span className="text-2xl">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          {/* Risk Profile */}
          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Risk Profile
            </label>
            <div className="mt-2 flex gap-2">
              {['conservative', 'moderate', 'aggressive'].map((profile) => (
                <button
                  key={profile}
                  type="button"
                  onClick={() => handlePolicyChange('riskProfile', profile)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold uppercase transition-all ${
                    policies?.riskProfile === profile
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {profile}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {policies?.riskProfile === 'conservative'
                ? 'Max annual volatility: 12%, Max position: 4%'
                : policies?.riskProfile === 'aggressive'
                  ? 'Max annual volatility: 30%, Max position: 6%'
                  : 'Max annual volatility: 18%, Max position: 5%'}
            </p>
          </div>

          {/* Max Sector Allocation */}
          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Max Sector Allocation
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="30"
                step="1"
                value={policies?.maxSectorCap || 15}
                onChange={(e) => handlePolicyChange('maxSectorCap', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {policies?.maxSectorCap || 15}%
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              No single sector exceeds this % of portfolio
            </p>
          </div>

          {/* Holding Period */}
          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Preferred Holding Period
            </label>
            <select
              value={policies?.holdingPeriod || '5'}
              onChange={(e) => handlePolicyChange('holdingPeriod', e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="1">1 day (Scalp)</option>
              <option value="3">3 days (Short)</option>
              <option value="5">5 days (Medium) [Default]</option>
              <option value="10">10 days (Intermediate)</option>
              <option value="30">30 days (Long)</option>
            </select>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Signals adjusted for your preferred timeframe
            </p>
          </div>

          {/* Volatility Tolerance */}
          <div>
            <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Annual Volatility Tolerance
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="8"
                max="35"
                step="1"
                value={policies?.volatilityTolerance || 18}
                onChange={(e) => handlePolicyChange('volatilityTolerance', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {policies?.volatilityTolerance || 18}%
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Signals filtered to match your risk appetite
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-900/20">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Live Demo:</strong> Change any policy above and watch alert recommendations re-rank and position
              sizes adjust in real-time for <strong>{(policies?.riskProfile || 'moderate').toUpperCase()}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalizationPanel;
