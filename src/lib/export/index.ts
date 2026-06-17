import type { ExportTableData, ReportExportFormat } from './types';
import { exportToCsv } from './csv-export';
import { exportToExcel } from './excel-export';
import { exportToPdf } from './pdf-export';
import { exportToWord } from './word-export';

export type { ExportColumn, ExportSummaryItem, ExportTableData, ReportExportFormat } from './types';

export async function exportReportTable(
  format: ReportExportFormat,
  data: ExportTableData
): Promise<void> {
  switch (format) {
    case 'csv':
      exportToCsv(data);
      return;
    case 'excel':
      exportToExcel(data);
      return;
    case 'pdf':
      await exportToPdf(data);
      return;
    case 'word':
      await exportToWord(data);
      return;
    default:
      throw new Error(`Unsupported export format: ${String(format)}`);
  }
}
