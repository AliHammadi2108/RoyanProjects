import { getPurchaseOrders, deletePurchaseOrder } from '@/actions/purchase-orders';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders();
  const usageMap = await fetchDocumentUsageMap(
    'PURCHASE_ORDER',
    orders.map((o) => o.id)
  );
  return (
    <GenericDocumentList
      variant="order"
      data={JSON.parse(JSON.stringify(orders))}
      onDelete={deletePurchaseOrder}
      usageMap={usageMap}
    />
  );
}
