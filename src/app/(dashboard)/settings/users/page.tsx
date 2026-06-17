import { requireScreenAccess } from '@/lib/permissions';
import { fetchUsers } from '@/actions/users';
import { UsersSettingsClient } from '@/components/pages/UsersSettingsClient';

export default async function UsersSettingsPage() {
  await requireScreenAccess('/settings/users');
  const users = await fetchUsers();
  return <UsersSettingsClient initialData={users as never} />;
}
