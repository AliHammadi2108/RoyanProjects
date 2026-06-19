import { getMasterData } from '@/actions/common';
import { getOrdersForReceiving } from '@/actions/purchase-orders';
import { ReceivingForm } from '@/components/pages/ReceivingForm';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NewReceivingPage({
  searchParams,
}: {
  searchParams: { orderId?: string; inspectionId?: string };
}) {
  const [masterData, orders] = await Promise.all([
    getMasterData(),
    getOrdersForReceiving(),
  ]);

  return (
    <ReceivingForm
      masterData={masterData}
      orders={serializeForClient(orders)}
      isNew
      defaultOrderId={searchParams.orderId}
      defaultInspectionId={searchParams.inspectionId}
    />
  );
}
