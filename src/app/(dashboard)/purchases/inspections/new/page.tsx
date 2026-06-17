import { getMasterData } from '@/actions/common';
import { getApprovedOrdersForInspection } from '@/actions/purchase-orders';
import { InspectionForm } from '@/components/pages/InspectionForm';

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
      approvedOrders={JSON.parse(JSON.stringify(approvedOrders))}
      isNew
      defaultOrderId={searchParams.orderId}
    />
  );
}
