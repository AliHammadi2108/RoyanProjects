import { prisma } from '@/lib/db';
import { getAllowedSupplierIds } from '@/services/supplier-access.service';
import {
  buildDateRange,
  parseReportFilters,
  resolveStatusFilter,
  sortRows,
  paginateSlice,
} from './filters';
import type { QuantityCostRow, ReportResult } from './types';

export async function getQuantityCostComparisonReport(
  userId: string,
  rawFilters: unknown
): Promise<ReportResult<QuantityCostRow>> {
  const filters = parseReportFilters(rawFilters);
  const statuses = resolveStatusFilter(filters);
  const dateRange = buildDateRange(filters);
  const allowedSuppliers = await getAllowedSupplierIds(userId, 'view');

  const supplierWhere =
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

  const orderWhere = {
    ...(statuses?.length ? { status: { in: statuses } } : {}),
    ...(Object.keys(dateRange).length ? { orderDate: dateRange } : {}),
    ...supplierWhere,
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
  };

  const [orderItems, receivingItems, invoiceItems] = await Promise.all([
    prisma.purchaseOrderItem.findMany({
      where: {
        purchaseOrder: orderWhere,
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
      },
      include: {
        item: { select: { id: true, code: true, nameAr: true } },
        purchaseOrder: { select: { exchangeRate: true } },
      },
    }),
    prisma.purchaseReceivingItem.findMany({
      where: {
        receiving: {
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
          purchaseOrder: statuses?.length ? { status: { in: statuses } } : {},
          ...supplierWhere,
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        },
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
      },
      include: {
        item: { select: { id: true, code: true, nameAr: true } },
        receiving: { select: { exchangeRate: true } },
      },
    }),
    prisma.purchaseInvoiceItem.findMany({
      where: {
        invoice: {
          ...(statuses?.length ? { status: { in: statuses } } : {}),
          ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
          ...supplierWhere,
          ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        },
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
      },
      include: {
        item: { select: { id: true, code: true, nameAr: true } },
        invoice: { select: { exchangeRate: true } },
      },
    }),
  ]);

  const byItem = new Map<string, QuantityCostRow>();

  const ensure = (itemId: string, code: string, name: string) => {
    if (!byItem.has(itemId)) {
      byItem.set(itemId, {
        itemId,
        itemCode: code,
        itemName: name,
        orderedBaseQty: 0,
        receivedBaseQty: 0,
        invoicedBaseQty: 0,
        orderedCost: 0,
        invoicedCost: 0,
        varianceQty: 0,
        varianceCost: 0,
      });
    }
    return byItem.get(itemId)!;
  };

  for (const line of orderItems) {
    const row = ensure(line.itemId, line.item.code, line.item.nameAr);
    row.orderedBaseQty += line.baseQty || line.quantity * line.factorToBase;
    row.orderedCost += (line.total || 0) * line.purchaseOrder.exchangeRate;
  }

  for (const line of receivingItems) {
    const row = ensure(line.itemId, line.item.code, line.item.nameAr);
    row.receivedBaseQty += line.baseQty || line.receivedQty * line.factorToBase;
  }

  for (const line of invoiceItems) {
    const row = ensure(line.itemId, line.item.code, line.item.nameAr);
    row.invoicedBaseQty += line.baseQty || line.quantity * line.factorToBase;
    row.invoicedCost += (line.total || 0) * line.invoice.exchangeRate;
  }

  let rows = Array.from(byItem.values()).map((r) => ({
    ...r,
    varianceQty: r.orderedBaseQty - r.receivedBaseQty,
    varianceCost: r.orderedCost - r.invoicedCost,
  }));

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) => r.itemName.toLowerCase().includes(q) || r.itemCode.toLowerCase().includes(q)
    );
  }

  const sorted = sortRows(rows, filters.sortBy || 'varianceQty', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      itemCount: total,
      totalOrderedQty: rows.reduce((s, r) => s + r.orderedBaseQty, 0),
      totalReceivedQty: rows.reduce((s, r) => s + r.receivedBaseQty, 0),
      totalVarianceQty: rows.reduce((s, r) => s + r.varianceQty, 0),
    },
    chartData: paged.slice(0, 8).map((r) => ({
      label: r.itemCode,
      value: Math.abs(r.varianceQty),
    })),
  };
}
