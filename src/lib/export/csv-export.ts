import type { ExportTableData } from './types';
import { downloadBlob, ensureExtension, formatCellValue } from './download-blob';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv(data: ExportTableData): void {
  const header = data.columns.map((c) => escapeCsv(c.label)).join(',');
  const body = data.rows
    .map((row) =>
      data.columns.map((c) => escapeCsv(formatCellValue(row[c.key]))).join(',')
    )
    .join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + header + '\n' + body], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(blob, ensureExtension(data.filename, 'csv'));
}
