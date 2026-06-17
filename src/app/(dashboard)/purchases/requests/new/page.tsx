import { getMasterData } from '@/actions/common';
import { PurchaseRequestForm } from '@/components/pages/PurchaseRequestForm';

export default async function NewPurchaseRequestPage() {
  const masterData = await getMasterData();
  return <PurchaseRequestForm masterData={masterData} isNew />;
}
