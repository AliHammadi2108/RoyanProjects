import { prisma } from '@/lib/db';
import { PURCHASE_STAGES, NEXT_ACTIONS } from '@/lib/constants';

export async function updateCycleStage(
  cycleId: string,
  stage: string,
  nextAction?: string,
  extra?: {
    supplierId?: string;
    totalAmount?: number;
    expectedArrival?: Date;
  }
) {
  return prisma.purchaseCycle.update({
    where: { id: cycleId },
    data: {
      currentStage: stage,
      nextAction: nextAction || NEXT_ACTIONS[stage] || nextAction,
      ...extra,
      updatedAt: new Date(),
    },
  });
}

export async function completeCycle(cycleId: string) {
  return prisma.purchaseCycle.update({
    where: { id: cycleId },
    data: {
      currentStage: PURCHASE_STAGES.COMPLETED,
      nextAction: NEXT_ACTIONS.COMPLETED,
      status: 'COMPLETED',
    },
  });
}

export async function getCycleWithAllStages(cycleId: string) {
  const cycle = await prisma.purchaseCycle.findUnique({
    where: { id: cycleId },
    include: {
      branch: true,
      currency: true,
      purchaseRequests: { include: { items: true, department: true, currency: true } },
      quotations: { include: { items: true, supplier: true, currency: true } },
      comparisons: { include: { items: true, currency: true } },
      nominations: { include: { items: true, supplier: true, currency: true } },
      orders: { include: { items: true, supplier: true, currency: true } },
      inspections: {
        include: {
          items: true,
          purchaseOrder: { select: { total: true, currency: true } },
        },
      },
      receivings: {
        include: {
          items: true,
          supplier: true,
          currency: true,
          purchaseOrder: { select: { total: true, currency: true } },
        },
      },
      invoices: { include: { items: true, supplier: true, currency: true } },
    },
  });
  return cycle;
}

export async function getTrackingStats(filters?: {
  branchId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where = {
    ...(filters?.branchId && { branchId: filters.branchId }),
    ...(filters?.dateFrom && { createdAt: { gte: filters.dateFrom } }),
  };

  const [
    requests, quotations, comparisons, nominations,
    orders, inspections, receivings, invoices,
  ] = await Promise.all([
    getPurchaseRequestStats(where),
    getQuotationStats(where),
    getComparisonStats(where),
    getNominationStats(where),
    getOrderStats(where),
    prisma.purchaseOrderInspection.groupBy({ by: ['inspectionResult'], _count: true }),
    getReceivingStats(where),
    getInvoiceStats(where),
  ]);

  return {
    purchaseRequests: requests,
    quotations,
    comparisons,
    nominations,
    orders,
    inspections: {
      total: inspections.reduce((s, i) => s + i._count, 0),
      pending: 0,
      approved: inspections.find((i) => i.inspectionResult === 'Accepted')?._count || 0,
      rejected: inspections.find((i) => i.inspectionResult === 'Rejected')?._count || 0,
      late: 0,
    },
    receivings,
    invoices,
  };
}

async function getPurchaseRequestStats(where: Record<string, unknown>) {
  const [total, byStatus] = await Promise.all([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.groupBy({ by: ['status'], where, _count: true }),
  ]);
  const get = (status: string) => byStatus.find((s) => s.status === status)?._count || 0;
  return { total, pending: get('Pending Approval'), approved: get('Approved'), rejected: get('Rejected'), late: 0 };
}

async function getQuotationStats(where: Record<string, unknown>) {
  const [total, byStatus] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.groupBy({ by: ['status'], where, _count: true }),
  ]);
  const get = (status: string) => byStatus.find((s) => s.status === status)?._count || 0;
  return { total, pending: get('Pending Approval'), approved: get('Approved'), rejected: get('Rejected'), late: 0 };
}

async function getComparisonStats(where: Record<string, unknown>) {
  const [total, byStatus] = await Promise.all([
    prisma.technicalComparison.count({ where }),
    prisma.technicalComparison.groupBy({ by: ['status'], where, _count: true }),
  ]);
  const get = (status: string) => byStatus.find((s) => s.status === status)?._count || 0;
  return { total, pending: get('Pending Approval'), approved: get('Approved'), rejected: get('Rejected'), late: 0 };
}

async function getNominationStats(where: Record<string, unknown>) {
  const [total, byStatus] = await Promise.all([
    prisma.supplierNomination.count({ where }),
    prisma.supplierNomination.groupBy({ by: ['status'], where, _count: true }),
  ]);
  const get = (status: string) => byStatus.find((s) => s.status === status)?._count || 0;
  return { total, pending: get('Pending Approval'), approved: get('Approved'), rejected: get('Rejected'), late: 0 };
}

async function getOrderStats(where: Record<string, unknown>) {
  const [total, byStatus] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.groupBy({ by: ['status'], where, _count: true }),
  ]);
  const get = (status: string) => byStatus.find((s) => s.status === status)?._count || 0;
  return { total, pending: get('Pending Approval'), approved: get('Approved'), rejected: get('Rejected'), late: 0 };
}

async function getReceivingStats(where: Record<string, unknown>) {
  const total = await prisma.purchaseReceiving.count({ where });
  return { total, pending: 0, approved: total, rejected: 0, late: 0 };
}

async function getInvoiceStats(where: Record<string, unknown>) {
  const [total, byStatus] = await Promise.all([
    prisma.purchaseInvoice.count({ where }),
    prisma.purchaseInvoice.groupBy({ by: ['status'], where, _count: true }),
  ]);
  const get = (status: string) => byStatus.find((s) => s.status === status)?._count || 0;
  return { total, pending: get('Draft'), approved: get('Posted'), rejected: get('Cancelled'), late: 0 };
}

export async function getTrackingList(filters?: {
  branchId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  supplierId?: string;
  search?: string;
}) {
  return prisma.purchaseCycle.findMany({
    where: {
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dateFrom && { createdAt: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { createdAt: { lte: filters.dateTo } }),
      ...(filters?.supplierId && { supplierId: filters.supplierId }),
      ...(filters?.search && {
        OR: [
          { cycleNo: { contains: filters.search } },
          { notes: { contains: filters.search } },
        ],
      }),
    },
    include: {
      branch: true,
      currency: true,
      purchaseRequests: {
        select: { documentNo: true, department: true, currency: true },
        take: 1,
      },
      orders: {
        select: { supplier: true, expectedArrival: true, total: true, currency: true },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
}

export async function checkLateCycles() {
  const cycles = await prisma.purchaseCycle.findMany({
    where: {
      status: 'IN_PROGRESS',
      expectedArrival: { lt: new Date() },
      isLate: false,
    },
  });

  for (const cycle of cycles) {
    const lateDays = Math.floor(
      (Date.now() - (cycle.expectedArrival?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
    );
    await prisma.purchaseCycle.update({
      where: { id: cycle.id },
      data: { isLate: true, lateDays },
    });
  }
}
