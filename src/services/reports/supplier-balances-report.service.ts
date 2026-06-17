import { prisma } from '@/lib/db';
import { getAllowedSupplierIds } from '@/services/supplier-access.service';
import {
  buildDateRange,
  parseReportFilters,
  resolveStatusFilter,
  sortRows,
  paginateSlice,
} from './filters';
import type { ReportResult, SupplierBalanceRow } from './types';

export async function getSupplierBalancesReport(
  userId: string,
  rawFilters: unknown
): Promise<ReportResult<SupplierBalanceRow>> {
  const filters = parseReportFilters(rawFilters);
  const statuses = resolveStatusFilter(filters);
  const dateRange = buildDateRange(filters);
  const allowedSuppliers = await getAllowedSupplierIds(userId, 'view_balance');

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

  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      ...(statuses?.length ? { status: { in: statuses } } : {}),
      ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}),
      ...supplierWhere,
    },
    include: {
      supplier: { select: { id: true, code: true, nameAr: true } },
    },
  });

  const bySupplier = new Map<string, SupplierBalanceRow>();

  for (const inv of invoices) {
    const key = inv.supplierId;
    const paidAmount = inv.paidAmount ?? 0;
    const remaining = inv.remainingAmount ?? Math.max(0, inv.netTotal - paidAmount);
    const balance = remaining;

    const existing = bySupplier.get(key);
    if (existing) {
      existing.invoiceCount += 1;
      existing.totalInvoiced += inv.netTotal;
      existing.totalPaid += paidAmount;
      existing.balance += balance;
    } else {
      bySupplier.set(key, {
        supplierId: inv.supplierId,
        supplierCode: inv.supplier.code,
        supplierName: inv.supplier.nameAr,
        invoiceCount: 1,
        totalInvoiced: inv.netTotal,
        totalPaid: paidAmount,
        balance,
      });
    }
  }

  let rows = Array.from(bySupplier.values());
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.supplierName.toLowerCase().includes(q) ||
        r.supplierCode.toLowerCase().includes(q)
    );
  }

  const sorted = sortRows(rows, filters.sortBy || 'balance', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);

  const chartData = paged.slice(0, 10).map((r) => ({
    label: r.supplierName,
    value: r.balance,
  }));

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      supplierCount: total,
      totalInvoiced: rows.reduce((s, r) => s + r.totalInvoiced, 0),
      totalBalance: rows.reduce((s, r) => s + r.balance, 0),
    },
    chartData,
  };
}
