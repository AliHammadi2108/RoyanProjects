import { fetchNotifications } from '@/actions/common';
import { NotificationsClient } from '@/components/pages/NotificationsClient';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NotificationsPage() {
  const { notifications, isAdmin } = await fetchNotifications();
  return (
    <NotificationsClient
      initialData={serializeForClient(notifications)}
      isAdmin={isAdmin}
    />
  );
}
