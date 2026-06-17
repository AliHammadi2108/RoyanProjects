import { getPurchaseRequests } from '@/actions/purchase-requests';
import { PurchaseRequestsClient } from '@/components/pages/PurchaseRequestsClient';

export default async function PurchaseRequestsPage() {
  const requests = await getPurchaseRequests();
  return <PurchaseRequestsClient initialData={JSON.parse(JSON.stringify(requests))} />;
}
