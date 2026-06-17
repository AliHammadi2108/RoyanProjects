'use client';

import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReportViewMode = 'grid' | 'chart';

interface ReportViewToggleProps {
  mode: ReportViewMode;
  onChange: (mode: ReportViewMode) => void;
  canChart?: boolean;
}

export function ReportViewToggle({ mode, onChange, canChart = true }: ReportViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
          mode === 'grid'
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        )}
      >
        <Table2 className="w-4 h-4" />
        عرض كجدول
      </button>
      {canChart ? (
        <button
          type="button"
          onClick={() => onChange('chart')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border-r border-gray-200 transition-colors',
            mode === 'chart'
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          <BarChart3 className="w-4 h-4" />
          عرض كرسم
        </button>
      ) : null}
    </div>
  );
}
