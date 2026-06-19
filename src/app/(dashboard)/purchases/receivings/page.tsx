import { getReceivings } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';
import { loadPurchaseListPageData } from '@/lib/purchase-list-page';

export default async function ReceivingsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { data, usageMap } = await loadPurchaseListPageData(
    () => getReceivings(),
    'RECEIVING'
  );
  return (
    <GenericDocumentList
      variant="receiving"
      data={data}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
