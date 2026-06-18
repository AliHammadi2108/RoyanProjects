import { prisma } from '@/lib/db';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES, PAYABLE_INVOICE_STATUSES } from '@/lib/constants';
import { getAllowedSupplierIds, supplierWhereForUser } from '@/services/supplier-access.service';
import {
  buildDateRange,
  parseReportFilters,
  resolveStatusFilter,
  sortRows,
  paginateSlice,
} from './filters';
import type { ReportResult, SupplierStatementRow } from './types';

export interface SupplierStatementFilters {
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  currencyId?: string;
  paymentStatus?: string;
  movementType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface SupplierWithInvoicesRow {
  id: string;
  code: string;
  nameAr: string;
  phone?: string | null;
  taxNo?: string | null;
  invoiceCount: number;
  defaultCurrencyId?: string | null;
  currencyIds: string[];
}

const FINANCIAL_INVOICE_STATUSES = PAYABLE_INVOICE_STATUSES;
const POSTED_VOUCHER_STATUS = 'Posted';

export function invoiceStatementLabels(supplierInvoiceNo?: string | null) {
  return {
    movementTypeLabel: DOCUMENT_LABELS_AR.INVOICE,
    description: supplierInvoiceNo
      ? `فاتورة مورد ${supplierInvoiceNo}`
      : DOCUMENT_LABELS_AR.INVOICE,
  };
}

export function paymentStatementLabels(bankReference?: string | null) {
  return {
    movementTypeLabel: 'سند صرف',
    description: bankReference ? `دفعة - ${bankReference}` : DOCUMENT_LABELS_AR.SUPPLIER_PAYMENT,
  };
}

function normalizePaymentStatus(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  if (s === 'partially_paid' || s === 'partial_paid') return 'partial';
  if (s === 'unpaid') return 'unpaid';
  if (s === 'paid') return 'paid';
  if (s === 'overdue') return 'overdue';
  return s;
}

function matchesPaymentFilter(invoiceStatus: string, filter?: string): boolean {
  if (!filter) return true;
  return normalizePaymentStatus(invoiceStatus) === normalizePaymentStatus(filter);
}

function isOverdue(dueDate: Date | null | undefined, remaining: number, paymentStatus: string): boolean {
  if (remaining <= 0.001) return false;
  if (normalizePaymentStatus(paymentStatus) === 'overdue') return true;
  if (!dueDate) return false;
  return dueDate < new Date();
}

function computeDisplayPaymentStatus(
  netTotal: number,
  paidAmount: number,
  remaining: number,
  dueDate: Date | null | undefined,
  storedStatus: string
): string {
  if (remaining <= 0.001 || paidAmount >= netTotal - 0.001) return 'Paid';
  if (isOverdue(dueDate, remaining, storedStatus)) return 'Overdue';
  if (paidAmount > 0) return 'Partially Paid';
  return 'Unpaid';
}

export async function getSuppliersWithInvoices(
  userId: string,
  search?: string
): Promise<SupplierWithInvoicesRow[]> {
  const allowedSuppliers = await getAllowedSupplierIds(userId, 'view_balance');

  const invoices = await prisma.purchaseInvoice.groupBy({
    by: ['supplierId'],
    where: {
      status: { in: [...FINANCIAL_INVOICE_STATUSES] },
      ...(allowedSuppliers === null
        ? {}
        : {
            supplierId: {
              in: allowedSuppliers.length > 0 ? allowedSuppliers : ['__none__'],
            },
          }),
    },
    _count: { id: true },
  });

  if (invoices.length === 0) return [];

  const supplierIds = invoices.map((i) => i.supplierId);
  const countMap = new Map(invoices.map((i) => [i.supplierId, i._count.id]));

  const suppliers = await prisma.supplier.findMany({
    where: {
      id: { in: supplierIds },
      ...supplierWhereForUser(allowedSuppliers),
    },
    select: {
      id: true,
      code: true,
      nameAr: true,
      phone: true,
      taxNo: true,
      defaultCurrencyId: true,
      currencies: { select: { currencyId: true, isDefault: true } },
    },
    orderBy: { nameAr: 'asc' },
  });

  let rows = suppliers.map((s) => ({
    id: s.id,
    code: s.code,
    nameAr: s.nameAr,
    phone: s.phone,
    taxNo: s.taxNo,
    defaultCurrencyId: s.defaultCurrencyId,
    currencyIds:
      s.currencies.length > 0
        ? s.currencies.map((c) => c.currencyId)
        : s.defaultCurrencyId
          ? [s.defaultCurrencyId]
          : [],
    invoiceCount: countMap.get(s.id) || 0,
  }));

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.nameAr.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.phone || '').toLowerCase().includes(q) ||
        (r.taxNo || '').toLowerCase().includes(q)
    );
  }

  return rows;
}

export async function getSupplierStatementReport(
  userId: string,
  supplierId: string,
  rawFilters: unknown
): Promise<ReportResult<SupplierStatementRow>> {
  const filters = parseReportFilters(rawFilters);
  const dateRange = buildDateRange(filters);
  const allowedSuppliers = await getAllowedSupplierIds(userId, 'view_balance');

  if (allowedSuppliers !== null && !allowedSuppliers.includes(supplierId)) {
    return { rows: [], total: 0, page: 1, pageSize: filters.pageSize, summary: {}, chartData: [] };
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: { defaultCurrency: true },
  });
  if (!supplier) {
    return { rows: [], total: 0, page: 1, pageSize: filters.pageSize, summary: {}, chartData: [] };
  }

  const invoiceWhere = {
    supplierId,
    status: { in: [...FINANCIAL_INVOICE_STATUSES] },
    ...(filters.currencyId ? { currencyId: filters.currencyId } : {}),
  };

  const [invoices, payments] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: invoiceWhere,
      include: { currency: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.supplierPaymentVoucher.findMany({
      where: {
        supplierId,
        status: POSTED_VOUCHER_STATUS,
        ...(filters.currencyId ? { currencyId: filters.currencyId } : {}),
      },
      include: {
        currency: true,
        allocations: { include: { invoice: true } },
      },
      orderBy: { paymentDate: 'asc' },
    }),
  ]);

  const movements: SupplierStatementRow[] = [];
  const openingDate = filters.dateFrom ? new Date(filters.dateFrom) : null;

  let openingBalance = supplier.openingBalance || 0;
  let totalPurchases = 0;
  let totalReturns = 0;
  let totalPayments = 0;

  for (const inv of invoices) {
    const paid = inv.paidAmount ?? 0;
    const remaining = inv.remainingAmount ?? Math.max(0, inv.netTotal - paid);
    const displayStatus = computeDisplayPaymentStatus(
      inv.netTotal,
      paid,
      remaining,
      inv.dueDate || inv.paymentDueDate,
      inv.paymentStatus
    );

    const invDate = inv.supplierInvoiceDate || inv.createdAt;
    const debit = inv.netTotal;

    if (openingDate && invDate < openingDate) {
      openingBalance += debit;
      continue;
    }

    if (!matchesPaymentFilter(displayStatus, filters.paymentStatus)) continue;

    if (filters.movementType && filters.movementType !== 'all' && filters.movementType !== 'purchase') {
      continue;
    }

    if (Object.keys(dateRange).length) {
      const inRange =
        (!dateRange.gte || invDate >= dateRange.gte) &&
        (!dateRange.lte || invDate <= dateRange.lte);
      if (!inRange) continue;
    }

    totalPurchases += debit;
    const invoiceLabels = invoiceStatementLabels(inv.supplierInvoiceNo);
    movements.push({
      id: inv.id,
      movementDate: invDate.toISOString(),
      movementType: 'purchase',
      movementTypeLabel: invoiceLabels.movementTypeLabel,
      documentNo: inv.documentNo,
      description: invoiceLabels.description,
      debit,
      credit: 0,
      balance: 0,
      currencyCode: inv.currency?.code || supplier.defaultCurrency?.code || 'SAR',
      exchangeRate: inv.exchangeRate,
      dueDate: (inv.dueDate || inv.paymentDueDate)?.toISOString(),
      paymentStatus: displayStatus,
      route: `${DOCUMENT_ROUTES.INVOICE}/${inv.id}`,
    });
  }

  for (const pv of payments) {
    const payDate = pv.paymentDate;
    const credit = pv.totalAmount;

    if (openingDate && payDate < openingDate) {
      openingBalance -= credit;
      continue;
    }

    if (filters.movementType && filters.movementType !== 'all' && filters.movementType !== 'payment') {
      continue;
    }

    if (Object.keys(dateRange).length) {
      const inRange =
        (!dateRange.gte || payDate >= dateRange.gte) &&
        (!dateRange.lte || payDate <= dateRange.lte);
      if (!inRange) continue;
    }

    totalPayments += credit;
    const paymentLabels = paymentStatementLabels(pv.bankReference);
    movements.push({
      id: pv.id,
      movementDate: payDate.toISOString(),
      movementType: 'payment',
      movementTypeLabel: paymentLabels.movementTypeLabel,
      documentNo: pv.documentNo,
      description: paymentLabels.description,
      debit: 0,
      credit,
      balance: 0,
      currencyCode: pv.currency?.code || supplier.defaultCurrency?.code || 'SAR',
      exchangeRate: pv.exchangeRate,
      paymentStatus: 'Paid',
      route: `${DOCUMENT_ROUTES.SUPPLIER_PAYMENT}/${pv.id}`,
    });
  }

  movements.sort(
    (a, b) => new Date(a.movementDate).getTime() - new Date(b.movementDate).getTime()
  );

  let runningBalance = openingBalance;
  for (const row of movements) {
    runningBalance += row.debit - row.credit;
    row.balance = runningBalance;
  }

  const closingBalance = runningBalance;

  const sorted = sortRows(movements, filters.sortBy || 'movementDate', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      openingBalance,
      totalPurchases,
      totalReturns,
      totalPayments,
      closingBalance,
      movementCount: total,
    },
    chartData: paged.slice(0, 12).map((r) => ({
      label: r.documentNo,
      value: r.debit || r.credit,
    })),
  };
}
