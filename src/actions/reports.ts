'use server';

import { requirePermission, hasPermission, requireAuth } from '@/lib/permissions';
import { getOperationsReport } from '@/services/reports/operations-report.service';
import { getSupplierBalancesReport } from '@/services/reports/supplier-balances-report.service';
import {
  getSupplierStatementReport,
  getSuppliersWithInvoices,
} from '@/services/reports/supplier-statement.service';
import { getUsedDocumentsReport } from '@/services/reports/used-documents-report.service';
import { getQuantityCostComparisonReport } from '@/services/reports/quantity-cost-report.service';
import { getApprovalsReport } from '@/services/reports/approvals-report.service';
import { prisma } from '@/lib/db';
import { getAllowedSupplierIds, supplierWhereForUser } from '@/services/supplier-access.service';

export async function fetchOperationsReport(filters: unknown) {
  const user = await requirePermission('reports.operations.view');
  return getOperationsReport(user.id, filters);
}

export async function fetchQuantityCostReport(filters: unknown) {
  const user = await requirePermission('reports.quantity_cost.view');
  const canViewCost = await hasPermission(user.id, 'reports.view_cost');
  const result = await getQuantityCostComparisonReport(user.id, filters);
  if (!canViewCost) {
    return {
      ...result,
      rows: result.rows.map((r) => ({
        ...r,
        orderedCost: 0,
        invoicedCost: 0,
        varianceCost: 0,
      })),
      summary: { ...result.summary, totalVarianceCost: 0 },
    };
  }
  return result;
}

export async function fetchSupplierBalancesReport(filters: unknown) {
  const user = await requirePermission('reports.supplier_debt.view');
  const canViewBalance = await hasPermission(user.id, 'reports.view_supplier_balance');
  const result = await getSupplierBalancesReport(user.id, filters);
  if (!canViewBalance) {
    return {
      ...result,
      rows: result.rows.map((r) => ({
        ...r,
        totalInvoiced: 0,
        totalPaid: 0,
        balance: 0,
      })),
      summary: { supplierCount: result.summary.supplierCount, totalInvoiced: 0, totalBalance: 0 },
      chartData: [],
    };
  }
  return result;
}

export async function fetchSupplierStatementReport(supplierId: string, filters: unknown) {
  const user = await requirePermission('reports.supplier_statement.view');
  const canViewBalance = await hasPermission(user.id, 'reports.view_supplier_balance');
  const result = await getSupplierStatementReport(user.id, supplierId, filters);
  if (!canViewBalance) {
    return {
      ...result,
      rows: result.rows.map((r) => ({
        ...r,
        debit: 0,
        credit: 0,
        balance: 0,
      })),
      summary: {
        movementCount: result.summary.movementCount ?? 0,
        openingBalance: 0,
        totalPurchases: 0,
        totalReturns: 0,
        totalPayments: 0,
        closingBalance: 0,
      },
      chartData: [],
    };
  }
  return result;
}

export async function fetchSuppliersForStatement(search?: string) {
  const user = await requirePermission('reports.supplier_statement.view');
  return getSuppliersWithInvoices(user.id, search);
}

export async function canViewSupplierStatementBalance() {
  const user = await requireAuth();
  return hasPermission(user.id, 'reports.view_supplier_balance');
}

export async function fetchApprovalsReport(filters: unknown) {
  const user = await requirePermission('reports.approvals.view');
  return getApprovalsReport(user.id, filters);
}

export async function fetchUsedDocumentsReport(filters: unknown) {
  const user = await requirePermission('reports.used_documents.view');
  return getUsedDocumentsReport(user.id, filters);
}

export async function fetchReportFilterOptions() {
  const user = await requireAuth();
  const allowedSuppliers = await getAllowedSupplierIds(user.id, 'view');

  const [suppliers, warehouses, items] = await Promise.all([
    prisma.supplier.findMany({
      where: supplierWhereForUser(allowedSuppliers),
      select: { id: true, code: true, nameAr: true },
      orderBy: { nameAr: 'asc' },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: 'asc' },
    }),
    prisma.item.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameAr: true },
      orderBy: { nameAr: 'asc' },
      take: 500,
    }),
  ]);

  return { suppliers, warehouses, items };
}

export async function canExportReports() {
  const user = await requireAuth();
  return hasPermission(user.id, 'reports.export');
}

export async function canPrintReports() {
  const user = await requireAuth();
  return hasPermission(user.id, 'reports.print');
}

export async function canViewReportCharts() {
  const user = await requireAuth();
  return hasPermission(user.id, 'reports.view_charts');
}
