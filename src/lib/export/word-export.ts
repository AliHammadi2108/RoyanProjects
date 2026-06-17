import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { ExportTableData } from './types';
import { ensureExtension, formatCellValue } from './download-blob';
import { downloadBlob } from './download-blob';

function buildSummaryParagraphs(data: ExportTableData): Paragraph[] {
  if (!data.summary?.length) return [];

  return [
    new Paragraph({
      bidirectional: true,
      children: [
        new TextRun({
          text: 'ملخص:',
          bold: true,
          rightToLeft: true,
        }),
      ],
    }),
    ...data.summary.map(
      (item) =>
        new Paragraph({
          bidirectional: true,
          children: [
            new TextRun({
              text: `${item.label}: ${item.value}`,
              rightToLeft: true,
            }),
          ],
        })
    ),
    new Paragraph({ text: '' }),
  ];
}

export async function exportToWord(data: ExportTableData): Promise<void> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: data.columns.map(
      (column) =>
        new TableCell({
          width: { size: 100 / data.columns.length, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              bidirectional: true,
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: column.label,
                  bold: true,
                  rightToLeft: true,
                }),
              ],
            }),
          ],
        })
    ),
  });

  const bodyRows = data.rows.map(
    (row) =>
      new TableRow({
        children: data.columns.map(
          (column) =>
            new TableCell({
              children: [
                new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: formatCellValue(row[column.key]),
                      rightToLeft: true,
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  const doc = new Document({
    features: {
      updateFields: true,
    },
    sections: [
      {
        children: [
          ...(data.title
            ? [
                new Paragraph({
                  bidirectional: true,
                  heading: HeadingLevel.HEADING_1,
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: data.title,
                      bold: true,
                      rightToLeft: true,
                    }),
                  ],
                }),
              ]
            : []),
          ...(data.subtitle
            ? [
                new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: data.subtitle,
                      rightToLeft: true,
                    }),
                  ],
                }),
              ]
            : []),
          ...(data.title || data.subtitle ? [new Paragraph({ text: '' })] : []),
          ...buildSummaryParagraphs(data),
          new Table({
            visuallyRightToLeft: true,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, ensureExtension(data.filename, 'docx'));
}
