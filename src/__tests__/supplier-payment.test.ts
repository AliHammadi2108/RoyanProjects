import { describe, it, expect, vi } from 'vitest';
import { PAYABLE_INVOICE_STATUSES, DOCUMENT_STATUS } from '@/lib/constants';
import { computeInvoiceRemaining } from '@/lib/invoice-payment';

vi.mock('@/lib/db', () => ({
  prisma: {
    purchaseInvoice: { findMany: vi.fn() },
    supplierPaymentVoucher: { findMany: vi.fn(), findUnique: vi.fn() },
    supplierPaymentAllocation: { findUnique: vi.fn() },
  },
}));

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

  it('uses purchase permission for open invoices access', async () => {
    const access = await import('@/services/supplier-access.service');
    const spy = vi.spyOn(access, 'assertSupplierAccess').mockResolvedValue(undefined);
    const { prisma } = await import('@/lib/db');
    vi.mocked(prisma.purchaseInvoice.findMany).mockResolvedValue([
      {
        id: 'inv1',
        documentNo: 'INV-1',
        netTotal: 500,
        paidAmount: 0,
        remainingAmount: 0,
        paymentStatus: 'Unpaid',
        dueDate: null,
        exchangeRate: 1,
        currencyId: null,
        currency: null,
        createdAt: new Date(),
      },
    ] as never);

    const { getOpenInvoicesForSupplier } = await import('@/services/supplier-payment.service');
    const rows = await getOpenInvoicesForSupplier('u1', 'sup1');
    expect(spy).toHaveBeenCalledWith('u1', 'sup1', 'use_in_purchase');
    expect(rows).toHaveLength(1);
    expect(rows[0].remainingAmount).toBe(500);
    spy.mockRestore();
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
