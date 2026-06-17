import { getInspections, deleteInspection } from '@/actions/purchase-orders';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function InspectionsPage() {
  const inspections = await getInspections();
  return (
    <GenericDocumentList
      variant="inspection"
      data={JSON.parse(JSON.stringify(inspections))}
      onDelete={deleteInspection}
    />
  );
}
