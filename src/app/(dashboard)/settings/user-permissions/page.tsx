import { getUsersForPermissions, getRoles } from '@/actions/access-control';
import { getAllPermissions } from '@/actions/access-control';
import { UserPermissionsClient } from '@/components/pages/UserPermissionsClient';

export default async function UserPermissionsPage() {
  const [users, roles, permissions] = await Promise.all([
    getUsersForPermissions(),
    getRoles(),
    getAllPermissions(),
  ]);
  return (
    <UserPermissionsClient
      users={JSON.parse(JSON.stringify(users))}
      roles={JSON.parse(JSON.stringify(roles))}
      permissions={JSON.parse(JSON.stringify(permissions))}
    />
  );
}
