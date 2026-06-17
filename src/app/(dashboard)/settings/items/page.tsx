import { getItemsSettings, getUnitsSettings, getSuppliersSettings } from '@/actions/master-data';
import { canEditReorderSettings } from '@/actions/reorder-alerts';
import { ItemsSettingsClient } from '@/components/pages/ItemsSettingsClient';
import { prisma } from '@/lib/db';

export default async function ItemsSettingsPage() {
  const [items, units, suppliers, warehouses, canEditReorder] = await Promise.all([
    getItemsSettings(),
    getUnitsSettings({ activeOnly: true }),
    getSuppliersSettings({ activeOnly: true }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameAr: true },
      orderBy: { nameAr: 'asc' },
    }),
    canEditReorderSettings(),
  ]);
  return (
    <ItemsSettingsClient
      initialData={JSON.parse(JSON.stringify(items))}
      units={JSON.parse(JSON.stringify(units))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
      warehouses={JSON.parse(JSON.stringify(warehouses))}
      canEditReorder={canEditReorder}
    />
  );
}
