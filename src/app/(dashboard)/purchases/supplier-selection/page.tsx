import { getNominations, deleteNomination } from '@/actions/comparisons';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function SupplierSelectionPage() {
  const nominations = await getNominations();
  const usageMap = await fetchDocumentUsageMap(
    'SUPPLIER_NOMINATION',
    nominations.map((n) => n.id)
  );
  return (
    <GenericDocumentList
      variant="nomination"
      data={JSON.parse(JSON.stringify(nominations))}
      onDelete={deleteNomination}
      usageMap={usageMap}
    />
  );
}
