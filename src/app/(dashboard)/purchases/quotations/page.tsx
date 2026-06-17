import { getQuotations, deleteQuotation } from '@/actions/quotations';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function QuotationsPage() {
  const quotations = await getQuotations();
  const usageMap = await fetchDocumentUsageMap(
    'QUOTATION',
    quotations.map((q) => q.id)
  );
  return (
    <GenericDocumentList
      variant="quotation"
      data={JSON.parse(JSON.stringify(quotations))}
      onDelete={deleteQuotation}
      usageMap={usageMap}
    />
  );
}
