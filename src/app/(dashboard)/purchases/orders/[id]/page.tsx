import { getPurchaseOrder, getApprovedNominations } from '@/actions/purchase-orders';
import { getMasterData } from '@/actions/common';
import { PurchaseOrderForm } from '@/components/pages/PurchaseOrderForm';
import { notFound } from 'next/navigation';
import { serializeForClient } from '@/lib/serialize-client';

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, masterData, approvedNominations] = await Promise.all([
    getPurchaseOrder(params.id),
    getMasterData(),
    getApprovedNominations(),
  ]);

  if (!order) notFound();

  return (
    <PurchaseOrderForm
      masterData={masterData}
      approvedNominations={serializeForClient(approvedNominations)}
      existing={serializeForClient(order)}
    />
  );
}
