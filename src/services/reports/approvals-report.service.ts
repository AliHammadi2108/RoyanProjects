import { prisma } from '@/lib/db';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';
import { buildDateRange, parseReportFilters, sortRows, paginateSlice } from './filters';
import type { ApprovalsReportRow, ReportResult } from './types';

async function resolveDocumentNo(
  documentType: string,
  documentId: string
): Promise<string | undefined> {
  switch (documentType) {
    case 'PURCHASE_REQUEST': {
      const d = await prisma.purchaseRequest.findUnique({
        where: { id: documentId },
        select: { documentNo: true },
      });
      return d?.documentNo;
    }
    case 'QUOTATION': {
      const d = await prisma.quotation.findUnique({
        where: { id: documentId },
        select: { documentNo: true },
      });
      return d?.documentNo;
    }
    case 'TECHNICAL_COMPARISON': {
      const d = await prisma.technicalComparison.findUnique({
        where: { id: documentId },
        select: { documentNo: true },
      });
      return d?.documentNo;
    }
    case 'SUPPLIER_NOMINATION': {
      const d = await prisma.supplierNomination.findUnique({
        where: { id: documentId },
        select: { documentNo: true },
      });
      return d?.documentNo;
    }
    case 'PURCHASE_ORDER': {
      const d = await prisma.purchaseOrder.findUnique({
        where: { id: documentId },
        select: { documentNo: true },
      });
      return d?.documentNo;
    }
    default:
      return undefined;
  }
}

export async function getApprovalsReport(
  _userId: string,
  rawFilters: unknown
): Promise<ReportResult<ApprovalsReportRow>> {
  const filters = parseReportFilters(rawFilters);
  const dateRange = buildDateRange(filters);

  const approvals = await prisma.approval.findMany({
    where: {
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
      ...(filters.documentType ? { documentType: filters.documentType } : {}),
      ...(Object.keys(dateRange).length ? { requestedAt: dateRange } : {}),
    },
    include: {
      requester: { select: { nameAr: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });

  const rows: ApprovalsReportRow[] = await Promise.all(
    approvals.map(async (a) => {
      const documentNo = await resolveDocumentNo(a.documentType, a.documentId);
      const route = DOCUMENT_ROUTES[a.documentType];
      return {
        id: a.id,
        documentType: a.documentType,
        documentTypeLabel: DOCUMENT_LABELS_AR[a.documentType] || a.documentType,
        documentId: a.documentId,
        documentNo,
        status: a.status,
        requestedBy: a.requester.nameAr,
        requestedAt: a.requestedAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        totalAmount: a.totalAmount,
        route: route ? `${route}/${a.documentId}` : undefined,
      };
    })
  );

  let filtered = rows;
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.documentNo?.toLowerCase().includes(q) ?? false) ||
        r.documentTypeLabel.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q)
    );
  }

  const sorted = sortRows(filtered, filters.sortBy || 'requestedAt', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);

  const byStatus = new Map<string, number>();
  for (const row of filtered) {
    byStatus.set(row.status, (byStatus.get(row.status) || 0) + 1);
  }

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      approvalCount: total,
      pending: filtered.filter((r) => r.status === 'Pending').length,
      approved: filtered.filter((r) => r.status === 'Approved').length,
      rejected: filtered.filter((r) => r.status === 'Rejected').length,
    },
    chartData: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
  };
}
