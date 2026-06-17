import { getItemsSettings, getUnitsSettings } from '@/actions/master-data';
import { ItemsSettingsClient } from '@/components/pages/ItemsSettingsClient';

export default async function ItemsSettingsPage() {
  const [items, units] = await Promise.all([getItemsSettings(), getUnitsSettings({ activeOnly: true })]);
  return (
    <ItemsSettingsClient
      initialData={JSON.parse(JSON.stringify(items))}
      units={JSON.parse(JSON.stringify(units))}
    />
  );
}
