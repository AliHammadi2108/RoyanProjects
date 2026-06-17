export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ensureExtension(filename: string, ext: string): string {
  const normalized = ext.startsWith('.') ? ext : `.${ext}`;
  return filename.toLowerCase().endsWith(normalized.toLowerCase())
    ? filename
    : `${filename}${normalized}`;
}

export function formatCellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  return String(value);
}
