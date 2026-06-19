import { getMasterData } from '@/actions/common';
import { PurchaseRequestForm } from '@/components/pages/PurchaseRequestForm';

export default async function NewPurchaseRequestPage({
  searchParams,
}: {
  searchParams: {
    itemId?: string;
    itemIds?: string;
    supplierId?: string;
    qty?: string;
  };
}) {
  const masterData = JSON.parse(JSON.stringify(await getMasterData()));
  return (
    <PurchaseRequestForm
      masterData={masterData}
      isNew
      prefill={searchParams}
    />
  );
}
