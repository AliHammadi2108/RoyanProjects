import { describe, it, expect } from 'vitest';
import {
  ARABIC_LOCALE_LATIN,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from '@/lib/utils';

const ARABIC_INDIC_DIGIT = /[\u0660-\u0669]/;

describe('number formatting (Western digits)', () => {
  it('uses ar-SA-u-nu-latn locale constant', () => {
    expect(ARABIC_LOCALE_LATIN).toBe('ar-SA-u-nu-latn');
  });

  it('formatNumber outputs Latin digits, not Arabic-Indic', () => {
    const formatted = formatNumber(1234567.89, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(formatted).not.toMatch(ARABIC_INDIC_DIGIT);
    expect(formatted).toMatch(/1/);
    expect(formatted).toMatch(/7/);
  });

  it('formatCurrency uses Western digits', () => {
    const formatted = formatCurrency(1500.5, 'ر.س');
    expect(formatted).not.toMatch(ARABIC_INDIC_DIGIT);
    expect(formatted).toContain('1');
    expect(formatted).toContain('ر.س');
  });

  it('formatDate and formatDateTime use Western digits', () => {
    const date = new Date('2024-06-15T14:30:00');
    const dateStr = formatDate(date);
    const dateTimeStr = formatDateTime(date);

    expect(dateStr).not.toMatch(ARABIC_INDIC_DIGIT);
    expect(dateTimeStr).not.toMatch(ARABIC_INDIC_DIGIT);
    expect(dateStr).toMatch(/2024/);
    expect(dateTimeStr).toMatch(/2024/);
  });

  it('returns dash for empty dates', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDateTime(undefined)).toBe('-');
  });
});
