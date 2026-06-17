import { getReceivings, deleteReceiving } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function ReceivingsPage() {
  const receivings = await getReceivings();
  return (
    <GenericDocumentList
      variant="receiving"
      data={JSON.parse(JSON.stringify(receivings))}
      onDelete={deleteReceiving}
    />
  );
}
