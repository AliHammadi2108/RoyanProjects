import { z } from 'zod';

export const DEFAULT_FINANCIAL_STATUSES = ['Approved', 'Posted'] as const;

export const reportFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.array(z.string()).optional(),
  supplierId: z.string().optional(),
  warehouseId: z.string().optional(),
  itemId: z.string().optional(),
  documentType: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  includeDraft: z.boolean().optional(),
  usageType: z.enum(['used', 'locked', 'all']).optional(),
  currencyId: z.string().optional(),
  paymentStatus: z.string().optional(),
  movementType: z.string().optional(),
  showInBaseCurrency: z.coerce.boolean().optional(),
});

export type ParsedReportFilters = z.infer<typeof reportFiltersSchema>;

export function parseReportFilters(input: unknown): ParsedReportFilters {
  return reportFiltersSchema.parse(input ?? {});
}

export function resolveStatusFilter(
  filters: ParsedReportFilters,
  defaultStatuses: readonly string[] = DEFAULT_FINANCIAL_STATUSES
): string[] | undefined {
  if (filters.includeDraft) return filters.status;
  if (filters.status && filters.status.length > 0) return filters.status;
  return [...defaultStatuses];
}

export function buildDateRange(filters: ParsedReportFilters): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.dateFrom) {
    range.gte = new Date(filters.dateFrom);
  }
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return range;
}

export function paginateSlice<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function sortRows<T>(
  rows: T[],
  sortBy?: string,
  sortDir: 'asc' | 'desc' = 'desc'
): T[] {
  if (!sortBy) return rows;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortBy];
    const bv = (b as Record<string, unknown>)[sortBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * dir;
    }
    return String(av).localeCompare(String(bv), 'ar') * dir;
  });
}
