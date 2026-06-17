import { describe, it, expect } from 'vitest';
import { formatDocumentCurrency, getCurrencySymbol } from '@/lib/utils';

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
});
