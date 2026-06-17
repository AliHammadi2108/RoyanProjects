import { describe, it, expect } from 'vitest';
import {
  formatDocumentCurrency,
  getCurrencySymbol,
  resolveDocumentCurrency,
} from '@/lib/utils';

describe('tracking currency display', () => {
  it('uses document currency symbol when available', () => {
    expect(getCurrencySymbol({ symbol: '$', code: 'USD' })).toBe('$');
    expect(formatDocumentCurrency(1000, { symbol: '$', code: 'USD' })).toContain('$');
  });

  it('falls back to currency code then default SAR', () => {
    expect(getCurrencySymbol({ code: 'EUR' })).toBe('EUR');
    expect(getCurrencySymbol(null)).toBe('ر.س');
    expect(formatDocumentCurrency(500, null)).toContain('ر.س');
  });

  it('resolves currency from document or linked purchase order', () => {
    expect(resolveDocumentCurrency({ currency: { symbol: '€' } })).toEqual({ symbol: '€' });
    expect(
      resolveDocumentCurrency({
        purchaseOrder: { currency: { symbol: '£' } },
      })
    ).toEqual({ symbol: '£' });
    expect(
      formatDocumentCurrency(
        2500,
        resolveDocumentCurrency({ currency: { symbol: '$', code: 'USD' } })
      )
    ).toContain('$');
  });
});
