import { getComparisons } from '@/actions/comparisons';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function ComparisonsPage() {
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
    />
  );
}
