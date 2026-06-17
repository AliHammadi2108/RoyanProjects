'use client';

import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { ReportViewToggle, type ReportViewMode } from './ReportViewToggle';
import { ReportExportMenu } from './ReportExportMenu';
import { PrintFooter } from '@/components/ui/PrintFooter';

export interface ReportSummaryItem {
  label: string;
  value: string | number;
}

interface ReportLayoutProps {
  title: string;
  subtitle?: string;
  viewMode: ReportViewMode;
  onViewModeChange: (mode: ReportViewMode) => void;
  onRefresh: () => void;
  loading?: boolean;
  canExport?: boolean;
  canPrint?: boolean;
  canWhatsApp?: boolean;
  canChart?: boolean;
  exportFilename: string;
  exportColumns: { key: string; label: string }[];
  exportRows: Record<string, unknown>[];
  summary?: ReportSummaryItem[];
  filters?: ReactNode;
  printedBy?: string;
  children: ReactNode;
}

export function ReportLayout({
  title,
  subtitle,
  viewMode,
  onViewModeChange,
  onRefresh,
  loading,
  canExport = true,
  canPrint = true,
  canWhatsApp = true,
  canChart = true,
  exportFilename,
  exportColumns,
  exportRows,
  summary,
  filters,
  printedBy,
  children,
}: ReportLayoutProps) {
  return (
    <div className="space-y-4 print:space-y-2" id="report-print-area">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportViewToggle
            mode={viewMode}
            onChange={onViewModeChange}
            canChart={canChart}
          />
          <ReportExportMenu
            filename={exportFilename}
            title={title}
            subtitle={subtitle}
            columns={exportColumns}
            rows={exportRows}
            summary={summary}
            canExport={canExport}
            canPrint={canPrint}
            canWhatsApp={canWhatsApp}
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="btn-secondary text-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {filters ? <div className="card print:hidden">{filters}</div> : null}

      {summary && summary.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summary.map((item) => (
            <div key={item.label} className="card border-r-4 border-r-primary-500 py-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className={loading ? 'opacity-60 pointer-events-none' : ''}>{children}</div>

      {printedBy ? <PrintFooter printedBy={printedBy} /> : null}
    </div>
  );
}
