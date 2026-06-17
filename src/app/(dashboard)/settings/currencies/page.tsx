import { getCurrencies } from '@/actions/master-data';
import { CurrenciesClient } from '@/components/pages/CurrenciesClient';

export default async function CurrenciesPage() {
  const data = await getCurrencies();
  return <CurrenciesClient initialData={JSON.parse(JSON.stringify(data))} />;
}
