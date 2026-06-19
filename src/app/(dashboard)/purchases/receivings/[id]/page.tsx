import { getReceiving, getOrdersForReceiving } from '@/actions/purchase-orders';
import { getMasterData } from '@/actions/common';
import { ReceivingForm } from '@/components/pages/ReceivingForm';
import { notFound } from 'next/navigation';
import { serializeForClient } from '@/lib/serialize-client';

export default async function ReceivingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [receiving, masterData, orders] = await Promise.all([
    getReceiving(params.id),
    getMasterData(),
    getOrdersForReceiving(),
  ]);

  if (!receiving) notFound();

  return (
    <ReceivingForm
      masterData={masterData}
      orders={serializeForClient(orders)}
      existing={serializeForClient(receiving)}
    />
  );
}
