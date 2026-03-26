import React from 'react';
import Card from './Card';
import CandlestickChart from './CandlestickChart';

function ChartCard({ title, subtitle, data, meta }) {
  return (
    <Card className="p-6" interactive={false}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="h-[28rem] w-full">
        <CandlestickChart data={data} meta={meta} />
      </div>
    </Card>
  );
}

export default ChartCard;
