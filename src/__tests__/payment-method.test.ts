import { describe, expect, it } from 'vitest';
import {
  getPaymentMethodLabel,
  normalizePaymentMethod,
  PAYMENT_METHODS,
} from '@/lib/constants';
import { quotationSchema, supplierPaymentSchema } from '@/lib/validations';

describe('payment method', () => {
  it('normalizes stored codes and legacy Arabic labels', () => {
    expect(normalizePaymentMethod(PAYMENT_METHODS.CASH)).toBe('cash');
    expect(normalizePaymentMethod('نقد')).toBe('cash');
    expect(normalizePaymentMethod('آجل')).toBe('credit');
    expect(normalizePaymentMethod('بنكي')).toBe('bank');
    expect(normalizePaymentMethod('')).toBe('');
  });

  it('returns Arabic labels for display', () => {
    expect(getPaymentMethodLabel('cash')).toBe('نقد');
    expect(getPaymentMethodLabel('credit')).toBe('آجل');
    expect(getPaymentMethodLabel('bank')).toBe('بنكي');
    expect(getPaymentMethodLabel(null)).toBe('—');
  });

  it('accepts empty payment method in optional schemas', () => {
    expect(
      quotationSchema.safeParse({
        purchaseRequestId: 'req1',
        branchId: 'b1',
        supplierId: 's1',
        paymentMethod: '',
        items: [
          {
            itemId: 'i1',
            itemNameSnapshot: 'صنف',
            quantity: 1,
            unitPrice: 10,
          },
        ],
      }).success
    ).toBe(true);

    expect(
      supplierPaymentSchema.safeParse({
        branchId: 'b1',
        supplierId: 's1',
        paymentMethod: '',
        totalAmount: 100,
        allocations: [{ invoiceId: 'inv1', allocatedAmount: 100 }],
      }).success
    ).toBe(true);
  });

  it('rejects invalid payment method values', () => {
    expect(
      quotationSchema.safeParse({
        purchaseRequestId: 'req1',
        branchId: 'b1',
        supplierId: 's1',
        paymentMethod: 'شيك',
        items: [
          {
            itemId: 'i1',
            itemNameSnapshot: 'صنف',
            quantity: 1,
            unitPrice: 10,
          },
        ],
      }).success
    ).toBe(false);
  });
});
