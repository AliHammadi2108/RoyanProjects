import { getInspections } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';
import { loadPurchaseListPageData } from '@/lib/purchase-list-page';

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { data, usageMap } = await loadPurchaseListPageData(
    () => getInspections(),
    'INSPECTION'
  );
  return (
    <GenericDocumentList
      variant="inspection"
      data={data}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
