import { getPurchaseRequest } from '@/actions/purchase-requests';
import { getMasterData } from '@/actions/common';
import { PurchaseRequestForm } from '@/components/pages/PurchaseRequestForm';
import { serializeForClient } from '@/lib/serialize-client';
import { notFound } from 'next/navigation';

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [request, masterData] = await Promise.all([
    getPurchaseRequest(params.id),
    getMasterData(),
  ]);

  if (!request) notFound();

  return (
    <PurchaseRequestForm
      masterData={masterData}
      existing={serializeForClient(request)}
    />
  );
}
