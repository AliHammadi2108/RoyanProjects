import { getRoles, getAllPermissions } from '@/actions/access-control';
import { RolesPermissionsClient } from '@/components/pages/RolesPermissionsClient';

export default async function RolesPage() {
  const [roles, permissions] = await Promise.all([getRoles(), getAllPermissions()]);
  return (
    <RolesPermissionsClient
      initialRoles={JSON.parse(JSON.stringify(roles))}
      permissions={JSON.parse(JSON.stringify(permissions))}
    />
  );
}
