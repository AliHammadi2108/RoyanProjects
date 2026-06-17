import { getMasterData } from '@/actions/common';
import { getOrdersForReceiving } from '@/actions/purchase-orders';
import { ReceivingForm } from '@/components/pages/ReceivingForm';

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
      orders={JSON.parse(JSON.stringify(orders))}
      isNew
      defaultOrderId={searchParams.orderId}
      defaultInspectionId={searchParams.inspectionId}
    />
  );
}
