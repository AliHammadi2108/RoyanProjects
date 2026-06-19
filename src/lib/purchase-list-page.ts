import { serializeForClient } from '@/lib/serialize-client';
import { fetchDocumentUsageMap } from '@/actions/common';
import type { UsageDocumentType } from '@/services/used-document.service';

/** Load list rows + usage map with Prisma-safe serialization for client components. */
export async function loadPurchaseListPageData<T extends { id: string }>(
  loadRows: () => Promise<T[]>,
  documentType?: UsageDocumentType
) {
  const rows = await loadRows();
  const usageMap =
    documentType != null
      ? await fetchDocumentUsageMap(
          documentType,
          rows.map((row) => row.id)
        )
      : {};
  return {
    data: serializeForClient(rows) as Record<string, unknown>[],
    usageMap: serializeForClient(usageMap),
  };
}
