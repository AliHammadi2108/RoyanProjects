import { getPurchaseRequests, getPurchaseRequestUsageMap } from '@/actions/purchase-requests';
import { PurchaseRequestsClient } from '@/components/pages/PurchaseRequestsClient';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const requests = await getPurchaseRequests();
  const usageMap = await getPurchaseRequestUsageMap(requests.map((r) => r.id));
  return (
    <PurchaseRequestsClient
      initialData={JSON.parse(JSON.stringify(requests))}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
