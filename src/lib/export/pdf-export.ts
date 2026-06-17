import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { ExportTableData } from './types';
import { ensureExtension, formatCellValue } from './download-blob';

function buildExportHtml(data: ExportTableData): HTMLElement {
  const container = document.createElement('div');
  container.dir = 'rtl';
  container.lang = 'ar';
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1100px;padding:24px;background:#fff;color:#111;font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:12px;';

  const titleHtml = data.title
    ? `<h1 style="margin:0 0 8px;font-size:20px;text-align:center;">${escapeHtml(data.title)}</h1>`
    : '';
  const subtitleHtml = data.subtitle
    ? `<p style="margin:0 0 16px;text-align:center;color:#555;">${escapeHtml(data.subtitle)}</p>`
    : '';

  const summaryHtml =
    data.summary && data.summary.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          ${data.summary
            .map(
              (item) =>
                `<div style="border:1px solid #ddd;border-right:4px solid #2563eb;border-radius:8px;padding:8px 12px;min-width:120px;">
                  <div style="font-size:11px;color:#666;">${escapeHtml(item.label)}</div>
                  <div style="font-size:16px;font-weight:700;">${escapeHtml(String(item.value))}</div>
                </div>`
            )
            .join('')}
        </div>`
      : '';

  const headerCells = data.columns
    .map(
      (column) =>
        `<th style="border:1px solid #ccc;padding:8px;background:#f3f4f6;text-align:right;font-weight:700;">${escapeHtml(column.label)}</th>`
    )
    .join('');

  const bodyRows = data.rows
    .map((row) => {
      const cells = data.columns
        .map(
          (column) =>
            `<td style="border:1px solid #ddd;padding:6px 8px;text-align:right;vertical-align:top;">${escapeHtml(formatCellValue(row[column.key]))}</td>`
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  container.innerHTML = `
    ${titleHtml}
    ${subtitleHtml}
    ${summaryHtml}
    <table style="width:100%;border-collapse:collapse;direction:rtl;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;

  document.body.appendChild(container);
  return container;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportToPdf(data: ExportTableData): Promise<void> {
  const container = buildExportHtml(data);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(ensureExtension(data.filename, 'pdf'));
  } finally {
    document.body.removeChild(container);
  }
}
