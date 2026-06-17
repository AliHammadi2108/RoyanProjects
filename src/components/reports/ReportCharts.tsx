'use client';

import { formatNumber } from '@/lib/utils';
import type { ReportChartPoint } from '@/services/reports/types';

interface ReportChartsProps {
  data: ReportChartPoint[];
  title?: string;
  valuePrefix?: string;
  emptyMessage?: string;
}

export function ReportCharts({
  data,
  title,
  valuePrefix = '',
  emptyMessage = 'لا توجد بيانات للرسم',
}: ReportChartsProps) {
  if (!data.length) {
    return (
      <div className="card text-center py-12 text-gray-500 text-sm">{emptyMessage}</div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="card space-y-4">
      {title ? <h3 className="text-sm font-medium text-gray-700">{title}</h3> : null}
      <div className="space-y-3" role="img" aria-label={title || 'رسم بياني'}>
        {data.map((point) => {
          const pct = Math.round((point.value / max) * 100);
          return (
            <div key={point.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600 gap-2">
                <span className="truncate flex-1 text-right" title={point.label}>
                  {point.label}
                </span>
                <span className="shrink-0 font-medium text-gray-800">
                  {valuePrefix}
                  {formatNumber(point.value)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
