import { getInspection, getApprovedOrdersForInspection } from '@/actions/purchase-orders';
import { getMasterData } from '@/actions/common';
import { InspectionForm } from '@/components/pages/InspectionForm';
import { notFound } from 'next/navigation';

export default async function InspectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [inspection, masterData, approvedOrders] = await Promise.all([
    getInspection(params.id),
    getMasterData(),
    getApprovedOrdersForInspection(),
  ]);

  if (!inspection) notFound();

  return (
    <InspectionForm
      masterData={masterData}
      approvedOrders={JSON.parse(JSON.stringify(approvedOrders))}
      existing={JSON.parse(JSON.stringify(inspection))}
    />
  );
}
