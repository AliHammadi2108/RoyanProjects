import * as XLSX from 'xlsx';
import type { ExportTableData } from './types';
import { ensureExtension, formatCellValue } from './download-blob';

export function exportToExcel(data: ExportTableData): void {
  const sheetRows = data.rows.map((row) => {
    const record: Record<string, string> = {};
    for (const column of data.columns) {
      record[column.label] = formatCellValue(row[column.key]);
    }
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
    header: data.columns.map((c) => c.label),
  });

  worksheet['!rtl'] = true;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'التقرير');
  XLSX.writeFile(workbook, ensureExtension(data.filename, 'xlsx'), {
    bookType: 'xlsx',
    type: 'binary',
  });
}
