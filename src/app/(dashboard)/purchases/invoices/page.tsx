import { getInvoices } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const invoices = await getInvoices();
  return (
    <GenericDocumentList
      variant="invoice"
      data={JSON.parse(JSON.stringify(invoices))}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
