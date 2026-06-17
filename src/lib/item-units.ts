export function calcBaseQty(qty: number, factorToBase: number): number {
  if (qty <= 0 || factorToBase <= 0) return 0;
  return qty * factorToBase;
}

export function calcFactorToBase(baseQty: number, qty: number): number {
  if (qty <= 0) return 1;
  return baseQty / qty;
}
