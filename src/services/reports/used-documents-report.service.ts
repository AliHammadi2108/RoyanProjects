import { prisma } from '@/lib/db';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';
import { isDocumentLocked } from '@/lib/operation-toolbar';
import { getDocumentUsageMap, type UsageDocumentType } from '@/services/used-document.service';
import { parseReportFilters, sortRows, paginateSlice } from './filters';
import type { ReportResult, UsedDocumentRow } from './types';

type DocSource = {
  type: UsageDocumentType | 'INVOICE';
  ids: { id: string; documentNo: string; date: Date; status: string }[];
};

async function loadDocumentSources(usageType?: string): Promise<DocSource[]> {
  const sources: DocSource[] = [];

  const [requests, quotations, comparisons, nominations, orders, inspections, receivings] =
    await Promise.all([
      prisma.purchaseRequest.findMany({
        select: { id: true, documentNo: true, requestDate: true, status: true },
      }),
      prisma.quotation.findMany({
        select: { id: true, documentNo: true, quotationDate: true, status: true },
      }),
      prisma.technicalComparison.findMany({
        select: { id: true, documentNo: true, createdAt: true, status: true },
      }),
      prisma.supplierNomination.findMany({
        select: { id: true, documentNo: true, createdAt: true, status: true },
      }),
      prisma.purchaseOrder.findMany({
        select: { id: true, documentNo: true, orderDate: true, status: true },
      }),
      prisma.purchaseOrderInspection.findMany({
        select: { id: true, documentNo: true, inspectionDate: true, status: true },
      }),
      prisma.purchaseReceiving.findMany({
        select: { id: true, documentNo: true, createdAt: true, receivingStatus: true },
      }),
    ]);

  if (usageType !== 'locked') {
    sources.push({
      type: 'PURCHASE_REQUEST',
      ids: requests.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.requestDate,
        status: d.status,
      })),
    });
    sources.push({
      type: 'QUOTATION',
      ids: quotations.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.quotationDate,
        status: d.status,
      })),
    });
    sources.push({
      type: 'TECHNICAL_COMPARISON',
      ids: comparisons.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.createdAt,
        status: d.status,
      })),
    });
    sources.push({
      type: 'SUPPLIER_NOMINATION',
      ids: nominations.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.createdAt,
        status: d.status,
      })),
    });
    sources.push({
      type: 'PURCHASE_ORDER',
      ids: orders.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.orderDate,
        status: d.status,
      })),
    });
    sources.push({
      type: 'INSPECTION',
      ids: inspections.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.inspectionDate,
        status: d.status,
      })),
    });
    sources.push({
      type: 'RECEIVING',
      ids: receivings.map((d) => ({
        id: d.id,
        documentNo: d.documentNo,
        date: d.createdAt,
        status: d.receivingStatus,
      })),
    });
  }

  if (usageType !== 'used') {
    const lockedDocs: DocSource[] = [
      {
        type: 'PURCHASE_REQUEST',
        ids: requests
          .filter((d) => isDocumentLocked(d.status))
          .map((d) => ({
            id: d.id,
            documentNo: d.documentNo,
            date: d.requestDate,
            status: d.status,
          })),
      },
      {
        type: 'QUOTATION',
        ids: quotations
          .filter((d) => isDocumentLocked(d.status))
          .map((d) => ({
            id: d.id,
            documentNo: d.documentNo,
            date: d.quotationDate,
            status: d.status,
          })),
      },
      {
        type: 'PURCHASE_ORDER',
        ids: orders
          .filter((d) => isDocumentLocked(d.status))
          .map((d) => ({
            id: d.id,
            documentNo: d.documentNo,
            date: d.orderDate,
            status: d.status,
          })),
      },
    ];
    sources.push(...lockedDocs);
  }

  return sources;
}

export async function getUsedDocumentsReport(
  _userId: string,
  rawFilters: unknown
): Promise<ReportResult<UsedDocumentRow>> {
  const filters = parseReportFilters(rawFilters);
  const usageType = filters.usageType || 'all';
  const sources = await loadDocumentSources(usageType);
  const rows: UsedDocumentRow[] = [];

  for (const source of sources) {
    if (source.type === 'INVOICE') continue;
    const usageTypes: UsageDocumentType[] = [
      'PURCHASE_REQUEST',
      'QUOTATION',
      'TECHNICAL_COMPARISON',
      'SUPPLIER_NOMINATION',
      'PURCHASE_ORDER',
      'INSPECTION',
      'RECEIVING',
    ];
    if (!usageTypes.includes(source.type as UsageDocumentType)) continue;

    const usageMap = await getDocumentUsageMap(
      source.type as UsageDocumentType,
      source.ids.map((d) => d.id)
    );

    for (const doc of source.ids) {
      const usage = usageMap.get(doc.id);
      const locked = isDocumentLocked(doc.status);
      const isUsed = usage?.isUsed ?? false;

      if (usageType === 'used' && !isUsed) continue;
      if (usageType === 'locked' && !locked) continue;
      if (usageType === 'all' && !isUsed && !locked) continue;

      const rowUsageType: 'used' | 'locked' = isUsed ? 'used' : 'locked';
      const route = `${DOCUMENT_ROUTES[source.type]}/${doc.id}`;

      rows.push({
        id: doc.id,
        documentType: source.type,
        documentTypeLabel: DOCUMENT_LABELS_AR[source.type] || source.type,
        documentNo: doc.documentNo,
        documentDate: doc.date.toISOString(),
        status: doc.status,
        usageType: rowUsageType,
        childType: usage?.childType,
        childNo: usage?.childNo,
        childRoute: usage?.childRoute,
        route,
      });
    }
  }

  let filtered = rows;
  if (filters.documentType) {
    filtered = filtered.filter((r) => r.documentType === filters.documentType);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.documentNo.toLowerCase().includes(q) ||
        r.documentTypeLabel.toLowerCase().includes(q) ||
        (r.childNo?.toLowerCase().includes(q) ?? false)
    );
  }

  const sorted = sortRows(filtered, filters.sortBy || 'documentDate', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);

  const usedCount = filtered.filter((r) => r.usageType === 'used').length;
  const lockedCount = filtered.filter((r) => r.usageType === 'locked').length;

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: { usedCount, lockedCount, total },
    chartData: [
      { label: 'مستخدمة', value: usedCount },
      { label: 'مقفلة', value: lockedCount },
    ],
  };
}
