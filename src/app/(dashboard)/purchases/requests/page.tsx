import { getPurchaseRequests, getPurchaseRequestUsageMap } from '@/actions/purchase-requests';
import { PurchaseRequestsClient } from '@/components/pages/PurchaseRequestsClient';
import { parseListFilter } from '@/lib/purchase-open-filter';
import { serializeForClient } from '@/lib/serialize-client';

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const requests = await getPurchaseRequests();
  const usageMap = serializeForClient(await getPurchaseRequestUsageMap(requests.map((r) => r.id)));
  return (
    <PurchaseRequestsClient
      initialData={serializeForClient(requests)}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
