import { describe, expect, it } from 'vitest';
import { DOCUMENT_LABELS_AR } from '@/lib/constants';
import {
  applyRunningBalance,
  convertAmountToBase,
  invoiceStatementLabels,
  paymentStatementLabels,
  resolveOpeningBalanceForCurrency,
  resolveOpeningBalanceInBase,
  summarizeStatementRows,
} from '@/services/reports/supplier-statement.service';
import type { SupplierStatementRow } from '@/services/reports/types';

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

describe('supplier statement currency logic', () => {
  it('converts document amounts to base using stored exchange rate', () => {
    expect(convertAmountToBase(100, 3.75)).toBe(375);
    expect(convertAmountToBase(50, 0)).toBe(50);
    expect(convertAmountToBase(50, null)).toBe(50);
  });

  it('applies opening balance only to supplier default currency', () => {
    expect(resolveOpeningBalanceForCurrency(1000, 'cur-sar', 'cur-sar')).toBe(1000);
    expect(resolveOpeningBalanceForCurrency(1000, 'cur-sar', 'cur-usd')).toBe(0);
    expect(resolveOpeningBalanceForCurrency(1000, null, 'cur-sar')).toBe(0);
  });

  it('converts opening balance to base currency via rateToBase', () => {
    expect(resolveOpeningBalanceInBase(100, { isBase: true })).toBe(100);
    expect(resolveOpeningBalanceInBase(100, { isBase: false, rateToBase: 3.75 })).toBe(375);
    expect(resolveOpeningBalanceInBase(0, { isBase: false, rateToBase: 3.75 })).toBe(0);
  });

  it('computes running balance per currency section', () => {
    const rows: SupplierStatementRow[] = [
      {
        id: '1',
        movementDate: '2025-01-01',
        movementType: 'purchase',
        movementTypeLabel: 'فاتورة',
        documentNo: 'INV-1',
        description: 'test',
        debit: 100,
        credit: 0,
        balance: 0,
        currencyId: 'sar',
        currencyCode: 'SAR',
        exchangeRate: 1,
        route: '/x',
      },
      {
        id: '2',
        movementDate: '2025-01-02',
        movementType: 'payment',
        movementTypeLabel: 'سند',
        documentNo: 'PV-1',
        description: 'pay',
        debit: 0,
        credit: 40,
        balance: 0,
        currencyId: 'sar',
        currencyCode: 'SAR',
        exchangeRate: 1,
        route: '/y',
      },
    ];

    const { rows: balanced, closingBalance } = applyRunningBalance(rows, 10);
    expect(balanced[0].balance).toBe(110);
    expect(balanced[1].balance).toBe(70);
    expect(closingBalance).toBe(70);

    const summary = summarizeStatementRows(balanced, 10, closingBalance);
    expect(summary.openingBalance).toBe(10);
    expect(summary.totalPurchases).toBe(100);
    expect(summary.totalPayments).toBe(40);
    expect(summary.closingBalance).toBe(70);
  });
});
