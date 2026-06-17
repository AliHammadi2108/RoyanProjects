import { describe, expect, it } from 'vitest';
import { coerceInteger, stepInteger } from '@/lib/integer-stepper';

describe('integer-stepper', () => {
  it('coerces to whole integers with minimum', () => {
    expect(coerceInteger(3.7)).toBe(4);
    expect(coerceInteger(3.2)).toBe(3);
    expect(coerceInteger('2.9')).toBe(3);
    expect(coerceInteger(-5, 0)).toBe(0);
    expect(coerceInteger('abc', 1)).toBe(1);
  });

  it('steps by whole integers only', () => {
    expect(stepInteger(5, 1)).toBe(6);
    expect(stepInteger(5.8, 1)).toBe(7);
    expect(stepInteger(2, -1)).toBe(1);
    expect(stepInteger(0, -1, 0)).toBe(0);
    expect(stepInteger(1.4, -1, 0)).toBe(0);
  });
});
