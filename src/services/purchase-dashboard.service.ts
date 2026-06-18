import { prisma } from '@/lib/db';
import { CLOSED_DOCUMENT_STATUSES } from '@/lib/purchase-open-filter';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES, PURCHASE_STAGES } from '@/lib/constants';
import type { ReportChartPoint } from '@/services/reports/types';

export interface PurchaseDashboardStage {
  stage: string;
  label: string;
  route: string;
  openCount: number;
  byStatus: ReportChartPoint[];
}

export interface PurchaseDashboardData {
  totalOpen: number;
  stages: PurchaseDashboardStage[];
  chartByStage: ReportChartPoint[];
}

const STAGE_ORDER = [
  PURCHASE_STAGES.PURCHASE_REQUEST,
  PURCHASE_STAGES.QUOTATION,
  PURCHASE_STAGES.TECHNICAL_COMPARISON,
  PURCHASE_STAGES.SUPPLIER_NOMINATION,
  PURCHASE_STAGES.PURCHASE_ORDER,
  PURCHASE_STAGES.INSPECTION,
  PURCHASE_STAGES.RECEIVING,
  PURCHASE_STAGES.INVOICE,
] as const;

const STAGE_ROUTE: Record<string, string> = {
  [PURCHASE_STAGES.PURCHASE_REQUEST]: DOCUMENT_ROUTES.PURCHASE_REQUEST,
  [PURCHASE_STAGES.QUOTATION]: DOCUMENT_ROUTES.QUOTATION,
  [PURCHASE_STAGES.TECHNICAL_COMPARISON]: DOCUMENT_ROUTES.TECHNICAL_COMPARISON,
  [PURCHASE_STAGES.SUPPLIER_NOMINATION]: DOCUMENT_ROUTES.SUPPLIER_NOMINATION,
  [PURCHASE_STAGES.PURCHASE_ORDER]: DOCUMENT_ROUTES.PURCHASE_ORDER,
  [PURCHASE_STAGES.INSPECTION]: DOCUMENT_ROUTES.INSPECTION,
  [PURCHASE_STAGES.RECEIVING]: DOCUMENT_ROUTES.RECEIVING,
  [PURCHASE_STAGES.INVOICE]: DOCUMENT_ROUTES.INVOICE,
};

const openStatusWhere = { status: { notIn: [...CLOSED_DOCUMENT_STATUSES] } };

async function getUsedQuotationIds(): Promise<string[]> {
  const [items, comparisons] = await Promise.all([
    prisma.technicalComparisonItem.findMany({
      where: { quotationId: { not: null } },
      select: { quotationId: true },
      distinct: ['quotationId'],
    }),
    prisma.technicalComparison.findMany({
      where: { quotationIds: { not: null } },
      select: { quotationIds: true },
    }),
  ]);
  const ids = new Set<string>();
  for (const row of items) {
    if (row.quotationId) ids.add(row.quotationId);
  }
  for (const comp of comparisons) {
    for (const id of (comp.quotationIds || '').split(',').filter(Boolean)) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

function toStatusChart(
  rows: Array<{ status: string; _count: number }>
): ReportChartPoint[] {
  return rows
    .filter((r) => r._count > 0)
    .map((r) => ({ label: r.status, value: r._count }))
    .sort((a, b) => b.value - a.value);
}

async function countOpenPurchaseRequests(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = {
    ...openStatusWhere,
    quotations: { none: {} },
  };
  const [count, grouped] = await Promise.all([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.groupBy({ by: ['status'], where, _count: true }),
  ]);
  return { count, byStatus: toStatusChart(grouped.map((g) => ({ status: g.status, _count: g._count }))) };
}

async function countOpenQuotations(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const usedIds = await getUsedQuotationIds();
  const where = {
    ...openStatusWhere,
    ...(usedIds.length > 0 ? { id: { notIn: usedIds } } : {}),
  };
  const [count, grouped] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.groupBy({ by: ['status'], where, _count: true }),
  ]);
  return { count, byStatus: toStatusChart(grouped.map((g) => ({ status: g.status, _count: g._count }))) };
}

async function countOpenComparisons(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = {
    ...openStatusWhere,
    nominations: { none: {} },
  };
  const [count, grouped] = await Promise.all([
    prisma.technicalComparison.count({ where }),
    prisma.technicalComparison.groupBy({ by: ['status'], where, _count: true }),
  ]);
  return { count, byStatus: toStatusChart(grouped.map((g) => ({ status: g.status, _count: g._count }))) };
}

async function countOpenNominations(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = {
    ...openStatusWhere,
    orders: { none: {} },
  };
  const [count, grouped] = await Promise.all([
    prisma.supplierNomination.count({ where }),
    prisma.supplierNomination.groupBy({ by: ['status'], where, _count: true }),
  ]);
  return { count, byStatus: toStatusChart(grouped.map((g) => ({ status: g.status, _count: g._count }))) };
}

async function countOpenOrders(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = {
    ...openStatusWhere,
    inspections: { none: {} },
    receivings: { none: {} },
    invoices: { none: {} },
  };
  const [count, grouped] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.groupBy({ by: ['status'], where, _count: true }),
  ]);
  return { count, byStatus: toStatusChart(grouped.map((g) => ({ status: g.status, _count: g._count }))) };
}

async function countOpenInspections(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = {
    inspectionResult: { in: ['Pending', 'Partially Accepted'] },
    receivings: { none: {} },
  };
  const [count, grouped] = await Promise.all([
    prisma.purchaseOrderInspection.count({ where }),
    prisma.purchaseOrderInspection.groupBy({ by: ['inspectionResult'], where, _count: true }),
  ]);
  return {
    count,
    byStatus: toStatusChart(
      grouped.map((g) => ({ status: g.inspectionResult, _count: g._count }))
    ),
  };
}

async function countOpenReceivings(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = {
    receivingStatus: { not: 'Fully Received' },
    invoices: { none: {} },
  };
  const [count, grouped] = await Promise.all([
    prisma.purchaseReceiving.count({ where }),
    prisma.purchaseReceiving.groupBy({ by: ['receivingStatus'], where, _count: true }),
  ]);
  return {
    count,
    byStatus: toStatusChart(
      grouped.map((g) => ({ status: g.receivingStatus, _count: g._count }))
    ),
  };
}

async function countOpenInvoices(): Promise<{ count: number; byStatus: ReportChartPoint[] }> {
  const where = { ...openStatusWhere };
  const [count, grouped] = await Promise.all([
    prisma.purchaseInvoice.count({ where }),
    prisma.purchaseInvoice.groupBy({ by: ['status'], where, _count: true }),
  ]);
  return { count, byStatus: toStatusChart(grouped.map((g) => ({ status: g.status, _count: g._count }))) };
}

const STAGE_COUNTERS: Record<string, () => Promise<{ count: number; byStatus: ReportChartPoint[] }>> = {
  [PURCHASE_STAGES.PURCHASE_REQUEST]: countOpenPurchaseRequests,
  [PURCHASE_STAGES.QUOTATION]: countOpenQuotations,
  [PURCHASE_STAGES.TECHNICAL_COMPARISON]: countOpenComparisons,
  [PURCHASE_STAGES.SUPPLIER_NOMINATION]: countOpenNominations,
  [PURCHASE_STAGES.PURCHASE_ORDER]: countOpenOrders,
  [PURCHASE_STAGES.INSPECTION]: countOpenInspections,
  [PURCHASE_STAGES.RECEIVING]: countOpenReceivings,
  [PURCHASE_STAGES.INVOICE]: countOpenInvoices,
};

export async function getPurchaseDashboardData(): Promise<PurchaseDashboardData> {
  const results = await Promise.all(
    STAGE_ORDER.map(async (stage) => {
      const { count, byStatus } = await STAGE_COUNTERS[stage]();
      return {
        stage,
        label: DOCUMENT_LABELS_AR[stage] || stage,
        route: STAGE_ROUTE[stage],
        openCount: count,
        byStatus,
      };
    })
  );

  const chartByStage = results.map((r) => ({ label: r.label, value: r.openCount }));
  const totalOpen = results.reduce((sum, r) => sum + r.openCount, 0);

  return { totalOpen, stages: results, chartByStage };
}
