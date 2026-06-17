import { getInspections, deleteInspection } from '@/actions/purchase-orders';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';

export default async function InspectionsPage() {
  const inspections = await getInspections();
  const usageMap = await fetchDocumentUsageMap(
    'INSPECTION',
    inspections.map((i) => i.id)
  );
  return (
    <GenericDocumentList
      variant="inspection"
      data={JSON.parse(JSON.stringify(inspections))}
      onDelete={deleteInspection}
      usageMap={usageMap}
    />
  );
}
