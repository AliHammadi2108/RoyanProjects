import { getMasterData } from '@/actions/common';
import { getApprovedOrdersForInspection } from '@/actions/purchase-orders';
import { InspectionForm } from '@/components/pages/InspectionForm';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const [masterData, approvedOrders] = await Promise.all([
    getMasterData(),
    getApprovedOrdersForInspection(),
  ]);

  return (
    <InspectionForm
      masterData={masterData}
      approvedOrders={serializeForClient(approvedOrders)}
      isNew
      defaultOrderId={searchParams.orderId}
    />
  );
}
