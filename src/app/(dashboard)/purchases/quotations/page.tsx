import { getQuotations } from '@/actions/quotations';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';
import { loadPurchaseListPageData } from '@/lib/purchase-list-page';

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { data, usageMap } = await loadPurchaseListPageData(
    () => getQuotations(),
    'QUOTATION'
  );
  return (
    <GenericDocumentList
      variant="quotation"
      data={data}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
