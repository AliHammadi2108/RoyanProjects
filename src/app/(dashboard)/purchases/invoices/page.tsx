import { getInvoices } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return (
    <GenericDocumentList
      variant="invoice"
      data={JSON.parse(JSON.stringify(invoices))}
    />
  );
}
