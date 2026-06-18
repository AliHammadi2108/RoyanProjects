/** Remaining balance on a purchase invoice (ignores stale zero in DB when still unpaid). */
export function computeInvoiceRemaining(
  netTotal: number,
  paidAmount?: number | null,
  remainingAmount?: number | null
): number {
  const paid = paidAmount ?? 0;
  const computed = Math.max(0, netTotal - paid);
  if (remainingAmount == null) return computed;
  if (remainingAmount <= 0.001 && computed > 0.001) return computed;
  return remainingAmount;
}
