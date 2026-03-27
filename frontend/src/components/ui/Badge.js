import React from 'react';

const toneStyles = {
  BUY: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200',
  HOLD: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/35 dark:text-amber-200',
  SELL: 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/35 dark:text-rose-200',
};

function Badge({ action = 'HOLD' }) {
  const normalized = String(action).toUpperCase();

  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold tracking-wide ${toneStyles[normalized] || toneStyles.HOLD}`}
    >
      {normalized}
    </span>
  );
}

export default Badge;
