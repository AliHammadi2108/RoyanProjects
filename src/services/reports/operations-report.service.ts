import { prisma } from '@/lib/db';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';
import { getAllowedSupplierIds } from '@/services/supplier-access.service';
import {
  buildDateRange,
  parseReportFilters,
  resolveStatusFilter,
  sortRows,
  paginateSlice,
} from './filters';
import type { OperationsReportRow, ReportResult } from './types';

const OPERATION_DOC_TYPES = [
  'PURCHASE_REQUEST',
  'QUOTATION',
  'PURCHASE_ORDER',
  'RECEIVING',
  'INVOICE',
] as const;

function matchesSearch(row: OperationsReportRow, search?: string): boolean {
  if (!search?.trim()) return true;
  const q = search.trim().toLowerCase();
  return (
    row.documentNo.toLowerCase().includes(q) ||
    (row.supplierName?.toLowerCase().includes(q) ?? false) ||
    row.documentTypeLabel.toLowerCase().includes(q)
  );
}

export async function getOperationsReport(
  userId: string,
  rawFilters: unknown
): Promise<ReportResult<OperationsReportRow>> {
  const filters = parseReportFilters(rawFilters);
  const statuses = resolveStatusFilter(filters);
  const dateRange = buildDateRange(filters);
  const allowedSuppliers = await getAllowedSupplierIds(userId, 'view');

  const supplierFilter =
    allowedSuppliers === null
      ? filters.supplierId
        ? { supplierId: filters.supplierId }
        : {}
      : {
          supplierId: {
            in: filters.supplierId
              ? allowedSuppliers.includes(filters.supplierId)
                ? [filters.supplierId]
                : ['__none__']
              : allowedSuppliers.length > 0
                ? allowedSuppliers
                : ['__none__'],
          },
        };

  const warehouseFilter = filters.warehouseId ? { warehouseId: filters.warehouseId } : {};
  const statusWhere = statuses?.length ? { status: { in: statuses } } : {};
  const dateField = (field: string) =>
    Object.keys(dateRange).length ? { [field]: dateRange } : {};

  const selectedTypes = filters.documentType
    ? [filters.documentType]
    : [...OPERATION_DOC_TYPES];

  const rows: OperationsReportRow[] = [];

  if (selectedTypes.includes('PURCHASE_REQUEST')) {
    const requests = await prisma.purchaseRequest.findMany({
      where: {
        ...statusWhere,
        ...dateField('requestDate'),
        ...warehouseFilter,
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      },
      include: {
        supplier: { select: { nameAr: true } },
        warehouse: { select: { nameAr: true } },
        currency: { select: { code: true } },
        items: filters.itemId ? { where: { itemId: filters.itemId } } : true,
      },
    });
    for (const doc of requests) {
      if (filters.itemId && doc.items.length === 0) continue;
      const baseQtyTotal = doc.items.reduce((s, i) => s + (i.baseQty || 0), 0);
      rows.push({
        id: doc.id,
        documentType: 'PURCHASE_REQUEST',
        documentTypeLabel: DOCUMENT_LABELS_AR.PURCHASE_REQUEST,
        documentNo: doc.documentNo,
        documentDate: doc.requestDate.toISOString(),
        status: doc.status,
        supplierName: doc.supplier?.nameAr,
        warehouseName: doc.warehouse?.nameAr,
        currencyCode: doc.currency?.code,
        exchangeRate: doc.exchangeRate,
        totalAmount: doc.totalAmount,
        baseQtyTotal,
        route: `${DOCUMENT_ROUTES.PURCHASE_REQUEST}/${doc.id}`,
      });
    }
  }

  if (selectedTypes.includes('QUOTATION')) {
    const quotations = await prisma.quotation.findMany({
      where: {
        ...statusWhere,
        ...dateField('quotationDate'),
        ...supplierFilter,
      },
      include: {
        supplier: { select: { nameAr: true } },
        currency: { select: { code: true } },
        items: filters.itemId ? { where: { itemId: filters.itemId } } : true,
      },
    });
    for (const doc of quotations) {
      if (filters.itemId && doc.items.length === 0) continue;
      const baseQtyTotal = doc.items.reduce((s, i) => s + (i.baseQty || 0), 0);
      rows.push({
        id: doc.id,
        documentType: 'QUOTATION',
        documentTypeLabel: DOCUMENT_LABELS_AR.QUOTATION,
        documentNo: doc.documentNo,
        documentDate: doc.quotationDate.toISOString(),
        status: doc.status,
        supplierName: doc.supplier?.nameAr,
        currencyCode: doc.currency?.code,
        exchangeRate: doc.exchangeRate,
        totalAmount: doc.total,
        baseQtyTotal,
        route: `${DOCUMENT_ROUTES.QUOTATION}/${doc.id}`,
      });
    }
  }

  if (selectedTypes.includes('PURCHASE_ORDER')) {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        ...statusWhere,
        ...dateField('orderDate'),
        ...supplierFilter,
        ...warehouseFilter,
      },
      include: {
        supplier: { select: { nameAr: true } },
        warehouse: { select: { nameAr: true } },
        currency: { select: { code: true } },
        items: filters.itemId ? { where: { itemId: filters.itemId } } : true,
      },
    });
    for (const doc of orders) {
      if (filters.itemId && doc.items.length === 0) continue;
      const baseQtyTotal = doc.items.reduce((s, i) => s + (i.baseQty || 0), 0);
      rows.push({
        id: doc.id,
        documentType: 'PURCHASE_ORDER',
        documentTypeLabel: DOCUMENT_LABELS_AR.PURCHASE_ORDER,
        documentNo: doc.documentNo,
        documentDate: doc.orderDate.toISOString(),
        status: doc.status,
        supplierName: doc.supplier?.nameAr,
        warehouseName: doc.warehouse?.nameAr,
        currencyCode: doc.currency?.code,
        exchangeRate: doc.exchangeRate,
        totalAmount: doc.total,
        baseQtyTotal,
        route: `${DOCUMENT_ROUTES.PURCHASE_ORDER}/${doc.id}`,
      });
    }
  }

  if (selectedTypes.includes('RECEIVING')) {
    const receivings = await prisma.purchaseReceiving.findMany({
      where: {
        ...(statuses?.length ? { purchaseOrder: { status: { in: statuses } } } : {}),
        ...dateField('createdAt'),
        ...supplierFilter,
        ...warehouseFilter,
      },
      include: {
        supplier: { select: { nameAr: true } },
        warehouse: { select: { nameAr: true } },
        currency: { select: { code: true } },
        items: filters.itemId ? { where: { itemId: filters.itemId } } : true,
      },
    });
    for (const doc of receivings) {
      if (filters.itemId && doc.items.length === 0) continue;
      const baseQtyTotal = doc.items.reduce((s, i) => s + (i.baseQty || 0), 0);
      rows.push({
        id: doc.id,
        documentType: 'RECEIVING',
        documentTypeLabel: DOCUMENT_LABELS_AR.RECEIVING,
        documentNo: doc.documentNo,
        documentDate: doc.createdAt.toISOString(),
        status: doc.receivingStatus,
        supplierName: doc.supplier?.nameAr,
        warehouseName: doc.warehouse?.nameAr,
        currencyCode: doc.currency?.code,
        exchangeRate: doc.exchangeRate,
        totalAmount: baseQtyTotal,
        baseQtyTotal,
        route: `${DOCUMENT_ROUTES.RECEIVING}/${doc.id}`,
      });
    }
  }

  if (selectedTypes.includes('INVOICE')) {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        ...statusWhere,
        ...dateField('createdAt'),
        ...supplierFilter,
        ...warehouseFilter,
      },
      include: {
        supplier: { select: { nameAr: true } },
        warehouse: { select: { nameAr: true } },
        items: filters.itemId ? { where: { itemId: filters.itemId } } : true,
      },
    });
    for (const doc of invoices) {
      if (filters.itemId && doc.items.length === 0) continue;
      const baseQtyTotal = doc.items.reduce((s, i) => s + (i.baseQty || 0), 0);
      rows.push({
        id: doc.id,
        documentType: 'INVOICE',
        documentTypeLabel: DOCUMENT_LABELS_AR.INVOICE,
        documentNo: doc.documentNo,
        documentDate: doc.createdAt.toISOString(),
        status: doc.status,
        supplierName: doc.supplier?.nameAr,
        warehouseName: doc.warehouse?.nameAr,
        exchangeRate: doc.exchangeRate,
        totalAmount: doc.netTotal,
        baseQtyTotal,
        route: `${DOCUMENT_ROUTES.INVOICE}/${doc.id}`,
      });
    }
  }

  const filtered = rows.filter((r) => matchesSearch(r, filters.search));
  const sorted = sortRows(filtered, filters.sortBy || 'documentDate', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);

  const byType = new Map<string, number>();
  for (const row of filtered) {
    byType.set(row.documentTypeLabel, (byType.get(row.documentTypeLabel) || 0) + 1);
  }

  const chartData = Array.from(byType.entries()).map(([label, value]) => ({ label, value }));

  const summary = {
    documentCount: total,
    totalAmount: filtered.reduce((s, r) => s + r.totalAmount, 0),
    totalBaseQty: filtered.reduce((s, r) => s + (r.baseQtyTotal || 0), 0),
  };

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary,
    chartData,
  };
}
