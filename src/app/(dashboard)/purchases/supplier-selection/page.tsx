import { getNominations, deleteNomination } from '@/actions/comparisons';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function SupplierSelectionPage() {
  const nominations = await getNominations();
  return (
    <GenericDocumentList
      variant="nomination"
      data={JSON.parse(JSON.stringify(nominations))}
      onDelete={deleteNomination}
    />
  );
}
