import { getInspections } from '@/actions/purchase-orders';
import { fetchDocumentUsageMap } from '@/actions/common';
import { GenericDocumentList } from '@/components/pages/GenericDocumentList';
import { parseListFilter } from '@/lib/purchase-open-filter';

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const inspections = await getInspections();
  const usageMap = await fetchDocumentUsageMap(
    'INSPECTION',
    inspections.map((i) => i.id)
  );
  return (
    <GenericDocumentList
      variant="inspection"
      data={JSON.parse(JSON.stringify(inspections))}
      usageMap={usageMap}
      initialFilter={parseListFilter(searchParams.filter)}
    />
  );
}
