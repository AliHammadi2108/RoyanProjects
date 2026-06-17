'use client';

import { Download, Printer } from 'lucide-react';

interface ReportExportProps {
  filename: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  canExport?: boolean;
  canPrint?: boolean;
}

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(row[c.key])).join(','))
    .join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportExport({
  filename,
  columns,
  rows,
  canExport = true,
  canPrint = true,
}: ReportExportProps) {
  if (!canExport && !canPrint) return null;

  return (
    <div className="inline-flex gap-2">
      {canExport ? (
        <button
          type="button"
          onClick={() => downloadCsv(filename, columns, rows)}
          className="btn-secondary text-sm inline-flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          تصدير
        </button>
      ) : null}
      {canPrint ? (
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary text-sm inline-flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      ) : null}
    </div>
  );
}
