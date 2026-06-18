import { getPurchaseOrders } from '@/actions/purchase-orders';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const orders = await getPurchaseOrders();
  const usageMap = await fetchDocumentUsageMap(
    'PURCHASE_ORDER',
    orders.map((o) => o.id)
  );
  return (
    <GenericDocumentList
      variant="order"
      data={JSON.parse(JSON.stringify(orders))}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
