import { getMasterData } from '@/actions/common';
import { getApprovedComparisonsForPurchaseOrder } from '@/actions/comparisons';
import { getApprovedNominations } from '@/actions/purchase-orders';
import { PurchaseOrderForm } from '@/components/pages/PurchaseOrderForm';

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
      approvedNominations={JSON.parse(JSON.stringify(approvedNominations))}
      approvedComparisons={JSON.parse(JSON.stringify(approvedComparisons))}
      isNew
      defaultNominationId={searchParams.nominationId}
      defaultComparisonId={searchParams.comparisonId}
    />
  );
}
