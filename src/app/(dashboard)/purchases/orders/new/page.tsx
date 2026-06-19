import { getMasterData } from '@/actions/common';
import { getApprovedComparisonsForPurchaseOrder } from '@/actions/comparisons';
import { getApprovedNominations } from '@/actions/purchase-orders';
import { PurchaseOrderForm } from '@/components/pages/PurchaseOrderForm';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: { nominationId?: string; comparisonId?: string };
}) {
  const [masterData, approvedNominations, approvedComparisons] = await Promise.all([
    getMasterData(),
    getApprovedNominations(),
    getApprovedComparisonsForPurchaseOrder(),
  ]);

  return (
    <PurchaseOrderForm
      masterData={masterData}
      approvedNominations={serializeForClient(approvedNominations)}
      approvedComparisons={serializeForClient(approvedComparisons)}
      isNew
      defaultNominationId={searchParams.nominationId}
      defaultComparisonId={searchParams.comparisonId}
    />
  );
}
