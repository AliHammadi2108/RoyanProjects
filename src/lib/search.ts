/** Client-side search over in-memory rows. */
export function clientSearch<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  fields: Array<(row: T) => string | null | undefined>
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields.some((fn) => (fn(row) || '').toLowerCase().includes(q))
  );
}

/** Search rows using a SEARCH_MAPPINGS entry (joins mapped fields). */
export function clientSearchMapped<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  mapping: (row: T) => string[]
): T[] {
  return clientSearch(rows, query, [(row) => mapping(row).join(' ')]);
}

export const SEARCH_MAPPINGS = {
  purchaseRequest: (row: Record<string, unknown>) => [
    String(row.documentNo || ''),
    String((row.department as { nameAr?: string })?.nameAr || ''),
    String((row.branch as { nameAr?: string })?.nameAr || ''),
    String((row.creator as { nameAr?: string })?.nameAr || ''),
  ],
  document: (row: Record<string, unknown>, extraFields: string[] = []) => [
    String(row.documentNo || ''),
    ...extraFields.map((k) => String(row[k] || '')),
    String((row.supplier as { nameAr?: string })?.nameAr || ''),
    String((row.creator as { nameAr?: string })?.nameAr || ''),
  ],
  supplier: (row: Record<string, unknown>) => [
    String(row.code || ''),
    String(row.nameAr || ''),
    String(row.phone || ''),
    String(row.email || ''),
  ],
  item: (row: Record<string, unknown>) => [
    String(row.code || ''),
    String(row.nameAr || ''),
    String(row.barcode || ''),
  ],
  unit: (row: Record<string, unknown>) => [
    String(row.code || ''),
    String(row.nameAr || ''),
    String(row.symbol || ''),
  ],
  currency: (row: Record<string, unknown>) => [
    String(row.code || ''),
    String(row.nameAr || ''),
    String(row.symbol || ''),
  ],
  user: (row: Record<string, unknown>) => [
    String(row.userNo || ''),
    String(row.nameAr || ''),
    String(row.phone || ''),
    String(row.email || ''),
    ...(Array.isArray(row.roles)
      ? (row.roles as Array<{ role?: { nameAr?: string; name?: string } }>).map(
          (r) => r.role?.nameAr || r.role?.name || ''
        )
      : []),
  ],
  approval: (row: Record<string, unknown>) => {
    const approval = row.approval as Record<string, unknown> | undefined;
    return [
      String(row.documentNo || ''),
      String(approval?.documentType || ''),
      String((approval?.requester as { nameAr?: string })?.nameAr || ''),
    ];
  },
  notification: (row: Record<string, unknown>) => [
    String(row.title || ''),
    String(row.message || ''),
    String(row.documentType || ''),
    String(row.type || ''),
    String((row.user as { nameAr?: string })?.nameAr || ''),
  ],
  approvalRule: (row: Record<string, unknown>) => [
    String(row.module || ''),
    String(row.operationType || ''),
    String(row.requiredPermission || ''),
  ],
  approvalMatrix: (row: Record<string, unknown>) => [
    String(row.documentType || ''),
    String((row.branch as { nameAr?: string })?.nameAr || ''),
    String((row.department as { nameAr?: string })?.nameAr || ''),
    String((row.role as { nameAr?: string })?.nameAr || ''),
  ],
  approvalRequest: (row: Record<string, unknown>) => [
    String(row.module || ''),
    String(row.operationType || ''),
    String(row.referenceId || ''),
    String((row.requester as { nameAr?: string })?.nameAr || ''),
  ],
  role: (row: Record<string, unknown>) => [
    String(row.name || ''),
    String(row.nameAr || ''),
  ],
  cycle: (row: Record<string, unknown>) => [
    String(row.cycleNo || ''),
    String(row.currentStage || ''),
    String(row.nextAction || ''),
    String((row.branch as { nameAr?: string })?.nameAr || ''),
  ],
} as const;
