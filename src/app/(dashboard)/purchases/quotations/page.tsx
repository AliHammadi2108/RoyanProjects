import { getQuotations } from '@/actions/quotations';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const quotations = await getQuotations();
  const usageMap = await fetchDocumentUsageMap(
    'QUOTATION',
    quotations.map((q) => q.id)
  );
  return (
    <GenericDocumentList
      variant="quotation"
      data={JSON.parse(JSON.stringify(quotations))}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
