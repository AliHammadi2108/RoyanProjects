import { describe, it, expect } from 'vitest';
import { PAYABLE_INVOICE_STATUSES, DOCUMENT_STATUS } from '@/lib/constants';
import { computeInvoiceRemaining } from '@/lib/invoice-payment';

describe('supplier payment open invoices', () => {
  it('includes draft invoices as payable', () => {
    expect(PAYABLE_INVOICE_STATUSES).toContain(DOCUMENT_STATUS.DRAFT);
    expect(PAYABLE_INVOICE_STATUSES).toContain(DOCUMENT_STATUS.APPROVED);
    expect(PAYABLE_INVOICE_STATUSES).toContain(DOCUMENT_STATUS.POSTED);
  });

  it('recalculates remaining when DB has stale zero', () => {
    expect(computeInvoiceRemaining(1000, 0, 0)).toBe(1000);
    expect(computeInvoiceRemaining(1000, 200, 800)).toBe(800);
    expect(computeInvoiceRemaining(1000, 1000, 0)).toBe(0);
  });
});

describe('supplier payment routes', () => {
  it('maps supplier payment routes to permissions', async () => {
    const { getScreenPermissionForPath } = await import('@/lib/screen-access');
    expect(getScreenPermissionForPath('/purchases/supplier-payments')).toBe('supplier_payment.view');
    expect(getScreenPermissionForPath('/purchases/supplier-payments/new')).toBe('supplier_payment.view');
    expect(getScreenPermissionForPath('/purchases/supplier-payments/abc123')).toBe('supplier_payment.view');
  });
});

describe('payment status computation', () => {
  function computeStatus(netTotal: number, paidAmount: number, overdue: boolean) {
    const remaining = Math.max(0, netTotal - paidAmount);
    if (remaining <= 0.001) return 'Paid';
    if (paidAmount > 0) return overdue ? 'Overdue' : 'Partially Paid';
    return overdue ? 'Overdue' : 'Unpaid';
  }

  it('marks fully paid invoices', () => {
    expect(computeStatus(1000, 1000, false)).toBe('Paid');
  });

  it('marks partial payments', () => {
    expect(computeStatus(1000, 400, false)).toBe('Partially Paid');
  });

  it('marks overdue unpaid', () => {
    expect(computeStatus(1000, 0, true)).toBe('Overdue');
  });
});
