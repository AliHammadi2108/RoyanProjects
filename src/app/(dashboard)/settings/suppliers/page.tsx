import { getSuppliersSettings, getCurrencies } from '@/actions/master-data';
import { SuppliersSettingsClient } from '@/components/pages/SuppliersSettingsClient';

export default async function SuppliersSettingsPage() {
  const [suppliers, currencies] = await Promise.all([
    getSuppliersSettings(),
    getCurrencies({ activeOnly: true }),
  ]);
  return (
    <SuppliersSettingsClient
      initialData={JSON.parse(JSON.stringify(suppliers))}
      currencies={JSON.parse(JSON.stringify(currencies))}
    />
  );
}
