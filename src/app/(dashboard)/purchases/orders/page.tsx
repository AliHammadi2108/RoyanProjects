import { getPurchaseOrders, deletePurchaseOrder } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders();
  return (
    <GenericDocumentList
      variant="order"
      data={JSON.parse(JSON.stringify(orders))}
      onDelete={deletePurchaseOrder}
    />
  );
}
