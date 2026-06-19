import { getNomination, getApprovedComparisons } from '@/actions/comparisons';
import { getMasterData } from '@/actions/common';
import { NominationForm } from '@/components/pages/NominationForm';
import { notFound } from 'next/navigation';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NominationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [nomination, approvedComparisons, masterData] = await Promise.all([
    getNomination(params.id),
    getApprovedComparisons(),
    getMasterData(),
  ]);

  if (!nomination) notFound();

  return (
    <NominationForm
      masterData={masterData}
      approvedComparisons={serializeForClient(approvedComparisons)}
      existing={serializeForClient(nomination)}
    />
  );
}
