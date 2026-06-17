import { getUnitsSettings } from '@/actions/master-data';
import { UnitsClient } from '@/components/pages/UnitsClient';

export default async function UnitsPage() {
  const data = await getUnitsSettings();
  return <UnitsClient initialData={JSON.parse(JSON.stringify(data))} />;
}
