import { requireScreenAccess } from '@/lib/permissions';
import { ChangePasswordClient } from '@/components/pages/ChangePasswordClient';

export default async function ChangePasswordPage() {
  await requireScreenAccess('/settings/change-password');
  return <ChangePasswordClient />;
}
