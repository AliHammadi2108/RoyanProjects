import { describe, expect, it } from 'vitest';
import { DOCUMENT_LABELS_AR } from '@/lib/constants';
import {
  invoiceStatementLabels,
  paymentStatementLabels,
} from '@/services/reports/supplier-statement.service';

describe('supplier statement Arabic labels', () => {
  it('uses proper UTF-8 Arabic for purchase invoice rows', () => {
    expect(invoiceStatementLabels().movementTypeLabel).toBe('فاتورة مشتريات');
    expect(invoiceStatementLabels().description).toBe(DOCUMENT_LABELS_AR.INVOICE);
    expect(invoiceStatementLabels('INV-99').description).toBe('فاتورة مورد INV-99');
  });

  it('uses proper UTF-8 Arabic for payment voucher rows', () => {
    expect(paymentStatementLabels().movementTypeLabel).toBe('سند صرف');
    expect(paymentStatementLabels().description).toBe('سند صرف مورد');
    expect(paymentStatementLabels('REF-1').description).toBe('دفعة - REF-1');
  });

  it('does not contain mojibake byte patterns', () => {
    const labels = [
      invoiceStatementLabels().movementTypeLabel,
      invoiceStatementLabels('X').description,
      paymentStatementLabels().movementTypeLabel,
      paymentStatementLabels('X').description,
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/ط§|ظپ|ظ…/);
    }
  });
});
