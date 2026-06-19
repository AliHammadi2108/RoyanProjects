import { getApprovedComparisons } from '@/actions/comparisons';
import { getMasterData } from '@/actions/common';
import { NominationForm } from '@/components/pages/NominationForm';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NewNominationPage({
  searchParams,
}: {
  searchParams: { comparisonId?: string };
}) {
  const [approvedComparisons, masterData] = await Promise.all([
    getApprovedComparisons(),
    getMasterData(),
  ]);

  return (
    <NominationForm
      masterData={masterData}
      approvedComparisons={serializeForClient(approvedComparisons)}
      isNew
      defaultComparisonId={searchParams.comparisonId}
    />
  );
}
