import { getComparison } from '@/actions/comparisons';
import { getMasterData } from '@/actions/common';
import { ComparisonForm } from '@/components/pages/ComparisonForm';
import { notFound } from 'next/navigation';

export default async function ComparisonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [comparison, masterData] = await Promise.all([
    getComparison(params.id),
    getMasterData(),
  ]);

  if (!comparison) notFound();

  return (
    <ComparisonForm
      masterData={masterData}
      approvedRequests={[]}
      existing={JSON.parse(JSON.stringify(comparison))}
    />
  );
}
