import { getReceivings } from '@/actions/purchase-orders';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function ReceivingsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const receivings = await getReceivings();
  const usageMap = await fetchDocumentUsageMap(
    'RECEIVING',
    receivings.map((r) => r.id)
  );
  return (
    <GenericDocumentList
      variant="receiving"
      data={JSON.parse(JSON.stringify(receivings))}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
