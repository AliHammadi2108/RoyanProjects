import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CURRENCY_SYMBOL,
  formatAmount,
  formatAmountById,
  formatReportAmount,
  formatReportSummaryAmount,
  getBaseCurrency,
  getBaseCurrencySymbol,
  getDocumentCurrency,
} from '@/lib/utils';

const currencies = [
  { id: 'sar', code: 'SAR', nameAr: 'ريال', symbol: 'ر.س', isBase: true },
  { id: 'usd', code: 'USD', nameAr: 'دولار', symbol: '$', isBase: false },
];

describe('currency formatting helpers', () => {
  it('getBaseCurrency returns isBase currency', () => {
    expect(getBaseCurrency(currencies)?.code).toBe('SAR');
    expect(getBaseCurrencySymbol(currencies)).toBe('ر.س');
  });

  it('getDocumentCurrency resolves from currencyId', () => {
    expect(getDocumentCurrency({ currencyId: 'usd', currencies })?.symbol).toBe('$');
  });

  it('formatAmount uses document currency symbol', () => {
    expect(formatAmount(1200, { symbol: '$', code: 'USD' }, getBaseCurrency(currencies))).toContain('$');
    expect(formatAmount(1200, { symbol: '$', code: 'USD' }, getBaseCurrency(currencies))).not.toContain('ر.س');
  });

  it('formatAmount falls back to base currency when document currency missing', () => {
    expect(formatAmount(500, null, getBaseCurrency(currencies))).toContain('ر.س');
  });

  it('formatAmountById resolves currency from master list', () => {
    expect(formatAmountById(100, 'usd', currencies)).toContain('$');
  });

  it('formatReportAmount uses row currency code when present', () => {
    expect(formatReportAmount(250, 'USD', getBaseCurrency(currencies))).toContain('USD');
  });

  it('formatReportSummaryAmount uses base currency for aggregates', () => {
    expect(formatReportSummaryAmount(10000, getBaseCurrency(currencies))).toContain('ر.س');
  });

  it('DEFAULT_CURRENCY_SYMBOL is SAR shorthand', () => {
    expect(DEFAULT_CURRENCY_SYMBOL).toBe('ر.س');
  });
});
