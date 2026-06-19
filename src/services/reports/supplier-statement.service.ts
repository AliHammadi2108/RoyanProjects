import { prisma } from '@/lib/db';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES, PAYABLE_INVOICE_STATUSES } from '@/lib/constants';
import { getAllowedSupplierIds, supplierWhereForUser } from '@/services/supplier-access.service';
import {
  buildDateRange,
  parseReportFilters,
  sortRows,
  paginateSlice,
} from './filters';
import type {
  ReportSummary,
  SupplierStatementResult,
  SupplierStatementRow,
  SupplierStatementSection,
} from './types';

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
  showInBaseCurrency?: boolean;
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

/** Convert document amount to base currency using stored exchange rate at transaction time. */
export function convertAmountToBase(amount: number, exchangeRate?: number | null): number {
  return amount * (exchangeRate && exchangeRate > 0 ? exchangeRate : 1);
}

/** Opening balance applies only to the supplier default currency section. */
export function resolveOpeningBalanceForCurrency(
  supplierOpeningBalance: number,
  defaultCurrencyId: string | null | undefined,
  targetCurrencyId: string | null | undefined
): number {
  if (!defaultCurrencyId || !targetCurrencyId || defaultCurrencyId !== targetCurrencyId) {
    return 0;
  }
  return supplierOpeningBalance || 0;
}

/** Convert supplier opening balance (in default currency) to base currency. */
export function resolveOpeningBalanceInBase(
  supplierOpeningBalance: number,
  defaultCurrency?: { isBase?: boolean; rateToBase?: number } | null
): number {
  if (!supplierOpeningBalance) return 0;
  if (!defaultCurrency || defaultCurrency.isBase) return supplierOpeningBalance;
  return convertAmountToBase(supplierOpeningBalance, defaultCurrency.rateToBase);
}

export function applyRunningBalance(
  rows: SupplierStatementRow[],
  openingBalance: number
): { rows: SupplierStatementRow[]; closingBalance: number } {
  let runningBalance = openingBalance;
  const withBalance = rows.map((row) => {
    runningBalance += row.debit - row.credit;
    return { ...row, balance: runningBalance };
  });
  return { rows: withBalance, closingBalance: runningBalance };
}

export function summarizeStatementRows(
  rows: SupplierStatementRow[],
  openingBalance: number,
  closingBalance: number
): ReportSummary {
  let totalPurchases = 0;
  let totalPayments = 0;
  for (const row of rows) {
    totalPurchases += row.debit;
    totalPayments += row.credit;
  }
  return {
    openingBalance,
    totalPurchases,
    totalReturns: 0,
    totalPayments,
    closingBalance,
    movementCount: rows.length,
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

function resolveCurrencyId(
  documentCurrencyId: string | null | undefined,
  supplierDefaultCurrencyId: string | null | undefined,
  baseCurrencyId?: string
): string {
  return documentCurrencyId || supplierDefaultCurrencyId || baseCurrencyId || 'unknown';
}

function mapRowToBaseCurrency(
  row: SupplierStatementRow,
  baseCurrencyCode: string,
  baseCurrencyId?: string
): SupplierStatementRow {
  const rate = row.exchangeRate || 1;
  return {
    ...row,
    currencyId: baseCurrencyId,
    currencyCode: baseCurrencyCode,
    debit: convertAmountToBase(row.debit, rate),
    credit: convertAmountToBase(row.credit, rate),
    balance: 0,
    exchangeRate: rate,
  };
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
): Promise<SupplierStatementResult> {
  const filters = parseReportFilters(rawFilters);
  const dateRange = buildDateRange(filters);
  const showInBaseCurrency = Boolean(filters.showInBaseCurrency);
  const allowedSuppliers = await getAllowedSupplierIds(userId, 'view_balance');

  const emptyResult: SupplierStatementResult = {
    rows: [],
    total: 0,
    page: 1,
    pageSize: filters.pageSize,
    summary: {},
    chartData: [],
    showInBaseCurrency,
  };

  if (allowedSuppliers !== null && !allowedSuppliers.includes(supplierId)) {
    return emptyResult;
  }

  const [supplier, baseCurrency] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { defaultCurrency: true },
    }),
    prisma.currency.findFirst({
      where: { isBase: true, isActive: true },
      select: { id: true, code: true, nameAr: true, isBase: true, rateToBase: true },
    }),
  ]);

  if (!supplier) {
    return emptyResult;
  }

  const baseCurrencyCode = baseCurrency?.code || 'SAR';
  const baseCurrencyId = baseCurrency?.id;

  const invoiceWhere = {
    supplierId,
    status: { in: [...FINANCIAL_INVOICE_STATUSES] },
    ...(filters.currencyId && !showInBaseCurrency ? { currencyId: filters.currencyId } : {}),
  };

  const [invoices, payments, activeCurrencies] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: invoiceWhere,
      include: { currency: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.supplierPaymentVoucher.findMany({
      where: {
        supplierId,
        status: POSTED_VOUCHER_STATUS,
        ...(filters.currencyId && !showInBaseCurrency ? { currencyId: filters.currencyId } : {}),
      },
      include: {
        currency: true,
        allocations: { include: { invoice: true } },
      },
      orderBy: { paymentDate: 'asc' },
    }),
    prisma.currency.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameAr: true },
    }),
  ]);

  const currencyMeta = new Map(activeCurrencies.map((c) => [c.id, c]));
  const openingDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const rawMovements: SupplierStatementRow[] = [];
  const openingByCurrency = new Map<string, number>();

  const ensureOpening = (currencyId: string) => {
    if (!openingByCurrency.has(currencyId)) {
      openingByCurrency.set(
        currencyId,
        resolveOpeningBalanceForCurrency(
          supplier.openingBalance,
          supplier.defaultCurrencyId,
          currencyId
        )
      );
    }
    return openingByCurrency.get(currencyId)!;
  };

  for (const inv of invoices) {
    const currencyId = resolveCurrencyId(
      inv.currencyId,
      supplier.defaultCurrencyId,
      baseCurrencyId
    );
    const currencyCode = inv.currency?.code || supplier.defaultCurrency?.code || baseCurrencyCode;

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
      openingByCurrency.set(currencyId, ensureOpening(currencyId) + debit);
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

    const invoiceLabels = invoiceStatementLabels(inv.supplierInvoiceNo);
    rawMovements.push({
      id: inv.id,
      movementDate: invDate.toISOString(),
      movementType: 'purchase',
      movementTypeLabel: invoiceLabels.movementTypeLabel,
      documentNo: inv.documentNo,
      description: invoiceLabels.description,
      debit,
      credit: 0,
      balance: 0,
      currencyId,
      currencyCode,
      exchangeRate: inv.exchangeRate,
      dueDate: (inv.dueDate || inv.paymentDueDate)?.toISOString(),
      paymentStatus: displayStatus,
      route: `${DOCUMENT_ROUTES.INVOICE}/${inv.id}`,
    });
  }

  for (const pv of payments) {
    const currencyId = resolveCurrencyId(
      pv.currencyId,
      supplier.defaultCurrencyId,
      baseCurrencyId
    );
    const currencyCode = pv.currency?.code || supplier.defaultCurrency?.code || baseCurrencyCode;
    const payDate = pv.paymentDate;
    const credit = pv.totalAmount;

    if (openingDate && payDate < openingDate) {
      openingByCurrency.set(currencyId, ensureOpening(currencyId) - credit);
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

    const paymentLabels = paymentStatementLabels(pv.bankReference);
    rawMovements.push({
      id: pv.id,
      movementDate: payDate.toISOString(),
      movementType: 'payment',
      movementTypeLabel: paymentLabels.movementTypeLabel,
      documentNo: pv.documentNo,
      description: paymentLabels.description,
      debit: 0,
      credit,
      balance: 0,
      currencyId,
      currencyCode,
      exchangeRate: pv.exchangeRate,
      paymentStatus: 'Paid',
      route: `${DOCUMENT_ROUTES.SUPPLIER_PAYMENT}/${pv.id}`,
    });
  }

  rawMovements.sort(
    (a, b) => new Date(a.movementDate).getTime() - new Date(b.movementDate).getTime()
  );

  const useMultiCurrencySections =
    !showInBaseCurrency && !filters.currencyId && rawMovements.length > 0;

  if (showInBaseCurrency) {
    const baseRows = rawMovements.map((row) =>
      mapRowToBaseCurrency(row, baseCurrencyCode, baseCurrencyId)
    );
    const openingBalance = resolveOpeningBalanceInBase(
      supplier.openingBalance,
      supplier.defaultCurrency
    );
    const { rows: balanced, closingBalance } = applyRunningBalance(baseRows, openingBalance);
    const sorted = sortRows(balanced, filters.sortBy || 'movementDate', filters.sortDir);
    const total = sorted.length;
    const paged = paginateSlice(sorted, filters.page, filters.pageSize);
    const summary = summarizeStatementRows(sorted, openingBalance, closingBalance);

    return {
      rows: paged,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      summary,
      chartData: paged.slice(0, 12).map((r) => ({
        label: r.documentNo,
        value: r.debit || r.credit,
      })),
      showInBaseCurrency: true,
      baseCurrencyCode,
    };
  }

  if (useMultiCurrencySections) {
    const currencyIds = Array.from(
      new Set(rawMovements.map((r) => r.currencyId || r.currencyCode))
    );
    for (const currencyId of currencyIds) {
      ensureOpening(currencyId);
    }

    const sections: SupplierStatementSection[] = Array.from(currencyIds)
      .map((currencyId) => {
        const meta = currencyMeta.get(currencyId);
        const sectionRows = rawMovements.filter(
          (r) => (r.currencyId || r.currencyCode) === currencyId
        );
        const openingBalance = openingByCurrency.get(currencyId) ?? 0;
        const { rows: balanced, closingBalance } = applyRunningBalance(sectionRows, openingBalance);
        const sorted = sortRows(balanced, filters.sortBy || 'movementDate', filters.sortDir);
        return {
          currencyId,
          currencyCode: meta?.code || sectionRows[0]?.currencyCode || currencyId,
          currencyNameAr: meta?.nameAr,
          rows: sorted,
          total: sorted.length,
          summary: summarizeStatementRows(sorted, openingBalance, closingBalance),
        };
      })
      .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode, 'ar'));

    const allRows = sections.flatMap((s) => s.rows);

    return {
      rows: allRows,
      total: allRows.length,
      page: 1,
      pageSize: allRows.length || filters.pageSize,
      summary: {},
      chartData: [],
      sections,
      showInBaseCurrency: false,
      baseCurrencyCode,
    };
  }

  const targetCurrencyId =
    filters.currencyId ||
    supplier.defaultCurrencyId ||
    rawMovements[0]?.currencyId ||
    baseCurrencyId ||
    'unknown';
  const openingBalance =
    openingByCurrency.get(targetCurrencyId) ??
    resolveOpeningBalanceForCurrency(
      supplier.openingBalance,
      supplier.defaultCurrencyId,
      targetCurrencyId
    );

  const { rows: balanced, closingBalance } = applyRunningBalance(rawMovements, openingBalance);
  const sorted = sortRows(balanced, filters.sortBy || 'movementDate', filters.sortDir);
  const total = sorted.length;
  const paged = paginateSlice(sorted, filters.page, filters.pageSize);
  const summary = summarizeStatementRows(sorted, openingBalance, closingBalance);

  return {
    rows: paged,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary,
    chartData: paged.slice(0, 12).map((r) => ({
      label: r.documentNo,
      value: r.debit || r.credit,
    })),
    showInBaseCurrency: false,
    baseCurrencyCode,
  };
}
