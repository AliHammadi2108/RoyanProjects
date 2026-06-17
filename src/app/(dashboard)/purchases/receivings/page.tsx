import { getReceivings, deleteReceiving } from '@/actions/purchase-orders';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function ReceivingsPage() {
  const receivings = await getReceivings();
  const usageMap = await fetchDocumentUsageMap(
    'RECEIVING',
    receivings.map((r) => r.id)
  );
  return (
    <GenericDocumentList
      variant="receiving"
      data={JSON.parse(JSON.stringify(receivings))}
      onDelete={deleteReceiving}
      usageMap={usageMap}
    />
  );
}
