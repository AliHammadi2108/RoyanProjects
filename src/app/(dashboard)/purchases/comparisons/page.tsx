import { getComparisons } from '@/actions/comparisons';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function ComparisonsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const comparisons = await getComparisons();
  const usageMap = await fetchDocumentUsageMap(
    'TECHNICAL_COMPARISON',
    comparisons.map((c) => c.id)
  );
  return (
    <GenericDocumentList
      variant="comparison"
      data={JSON.parse(JSON.stringify(comparisons))}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
