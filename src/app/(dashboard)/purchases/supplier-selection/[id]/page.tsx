import { getNomination, getApprovedComparisons } from '@/actions/comparisons';
import { NominationForm } from '@/components/pages/NominationForm';
import { notFound } from 'next/navigation';

export default async function NominationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [nomination, approvedComparisons] = await Promise.all([
    getNomination(params.id),
    getApprovedComparisons(),
  ]);

  if (!nomination) notFound();

  return (
    <NominationForm
      approvedComparisons={JSON.parse(JSON.stringify(approvedComparisons))}
      existing={JSON.parse(JSON.stringify(nomination))}
    />
  );
}
