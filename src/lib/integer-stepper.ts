/** Coerce a numeric value to a whole integer, respecting a minimum. */
export function coerceInteger(value: number | string, min = 0): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.round(n));
}

/** Increment or decrement by `delta` (typically ±1), keeping whole integers. */
export function stepInteger(value: number, delta: number, min = 0): number {
  return Math.max(min, Math.round(value) + delta);
}
