import { describe, it, expect } from 'vitest';
import { getScreenPermissionForPath } from '@/lib/screen-access';
import {
  parseReportFilters,
  resolveStatusFilter,
  DEFAULT_FINANCIAL_STATUSES,
} from '@/services/reports/filters';

describe('screen-access reports', () => {
  it('maps report routes to view permissions', () => {
    expect(getScreenPermissionForPath('/reports/operations')).toBe('reports.operations.view');
    expect(getScreenPermissionForPath('/reports/quantity-cost')).toBe('reports.quantity_cost.view');
    expect(getScreenPermissionForPath('/reports/supplier-balances')).toBe('reports.supplier_debt.view');
    expect(getScreenPermissionForPath('/reports/supplier-statement')).toBe('reports.supplier_statement.view');
    expect(getScreenPermissionForPath('/reports/approvals')).toBe('reports.approvals.view');
    expect(getScreenPermissionForPath('/reports/used-documents')).toBe('reports.used_documents.view');
    expect(getScreenPermissionForPath('/reports/reorder-alerts')).toBe('inventory.reorder_alerts.view');
  });
});

describe('report filters', () => {
  it('defaults to approved/posted statuses for financial reports', () => {
    const filters = parseReportFilters({ page: 1 });
    expect(resolveStatusFilter(filters)).toEqual([...DEFAULT_FINANCIAL_STATUSES]);
  });

  it('allows all statuses when includeDraft is true', () => {
    const filters = parseReportFilters({ includeDraft: true, page: 1 });
    expect(resolveStatusFilter(filters)).toBeUndefined();
  });

  it('uses explicit status filter when provided', () => {
    const filters = parseReportFilters({ status: ['Draft'], page: 1 });
    expect(resolveStatusFilter(filters)).toEqual(['Draft']);
  });

  it('validates pagination bounds', () => {
    expect(() => parseReportFilters({ page: 0 })).toThrow();
    expect(() => parseReportFilters({ pageSize: 500 })).toThrow();
  });
});

describe('base_qty aggregation logic', () => {
  it('sums base_qty from line items', () => {
    const items = [
      { baseQty: 10, quantity: 5, factorToBase: 2 },
      { baseQty: 0, quantity: 3, factorToBase: 4 },
    ];
    const total = items.reduce(
      (s, i) => s + (i.baseQty || i.quantity * i.factorToBase),
      0
    );
    expect(total).toBe(22);
  });
});
