export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportSummaryItem {
  label: string;
  value: string | number;
}

export interface ExportTableData {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  summary?: ExportSummaryItem[];
}

export type ReportExportFormat = 'csv' | 'excel' | 'pdf' | 'word';
