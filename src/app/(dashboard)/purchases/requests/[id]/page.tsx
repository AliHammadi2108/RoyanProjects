import { getPurchaseRequest } from '@/actions/purchase-requests';
import { getMasterData } from '@/actions/common';
import { PurchaseRequestForm } from '@/components/pages/PurchaseRequestForm';
import { notFound } from 'next/navigation';

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [request, masterDataRaw] = await Promise.all([
    getPurchaseRequest(params.id),
    getMasterData(),
  ]);
  const masterData = JSON.parse(JSON.stringify(masterDataRaw));

  if (!request) notFound();

  return (
    <PurchaseRequestForm
      masterData={masterData}
      existing={JSON.parse(JSON.stringify(request))}
    />
  );
}
