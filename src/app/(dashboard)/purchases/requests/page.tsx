import { getPurchaseRequests, getPurchaseRequestUsageMap } from '@/actions/purchase-requests';
import { PurchaseRequestsClient } from '@/components/pages/PurchaseRequestsClient';

export default async function PurchaseRequestsPage() {
  const requests = await getPurchaseRequests();
  const usageMap = await getPurchaseRequestUsageMap(requests.map((r) => r.id));
  return (
    <PurchaseRequestsClient
      initialData={JSON.parse(JSON.stringify(requests))}
      usageMap={usageMap}
    />
  );
}
