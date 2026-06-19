import { getInvoices } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';
import { loadPurchaseListPageData } from '@/lib/purchase-list-page';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const { data, usageMap } = await loadPurchaseListPageData(
    () => getInvoices(),
    undefined
  );
  return (
    <GenericDocumentList
      variant="invoice"
      data={data}
      
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
