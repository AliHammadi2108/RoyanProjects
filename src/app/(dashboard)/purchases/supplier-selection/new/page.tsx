import { getApprovedComparisons } from '@/actions/comparisons';
import { NominationForm } from '@/components/pages/NominationForm';

export default async function NewNominationPage({
  searchParams,
}: {
  searchParams: { comparisonId?: string };
}) {
  const approvedComparisons = await getApprovedComparisons();

  return (
    <NominationForm
      approvedComparisons={JSON.parse(JSON.stringify(approvedComparisons))}
      isNew
      defaultComparisonId={searchParams.comparisonId}
    />
  );
}
