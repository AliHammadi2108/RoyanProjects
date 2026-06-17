import { getQuotations, deleteQuotation } from '@/actions/quotations';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function QuotationsPage() {
  const quotations = await getQuotations();
  return (
    <GenericDocumentList
      variant="quotation"
      data={JSON.parse(JSON.stringify(quotations))}
      onDelete={deleteQuotation}
    />
  );
}
