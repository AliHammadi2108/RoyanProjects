import { getUsersForPermissions } from '@/actions/access-control';
import { getSuppliersSettings } from '@/actions/master-data';
import { SupplierPermissionsClient } from '@/components/pages/SupplierPermissionsClient';

export default async function SupplierPermissionsPage() {
  const [users, suppliers] = await Promise.all([
    getUsersForPermissions(),
    getSuppliersSettings({ activeOnly: true }),
  ]);
  return (
    <SupplierPermissionsClient
      users={JSON.parse(JSON.stringify(users))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
    />
  );
}
