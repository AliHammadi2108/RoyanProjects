import { getComparisons, deleteComparison } from '@/actions/comparisons';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function ComparisonsPage() {
  const comparisons = await getComparisons();
  return (
    <GenericDocumentList
      variant="comparison"
      data={JSON.parse(JSON.stringify(comparisons))}
      onDelete={deleteComparison}
    />
  );
}
