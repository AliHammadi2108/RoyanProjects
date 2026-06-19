import { getPurchaseOrders } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';
import { loadPurchaseListPageData } from '@/lib/purchase-list-page';

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { data, usageMap } = await loadPurchaseListPageData(
    () => getPurchaseOrders(),
    'PURCHASE_ORDER'
  );
  return (
    <GenericDocumentList
      variant="order"
      data={data}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
