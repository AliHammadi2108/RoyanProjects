import { fetchNotifications } from '@/actions/common';
import { NotificationsClient } from '@/components/pages/NotificationsClient';

export default async function NotificationsPage() {
  const { notifications, isAdmin } = await fetchNotifications();
  return (
    <NotificationsClient
      initialData={JSON.parse(JSON.stringify(notifications))}
      isAdmin={isAdmin}
    />
  );
}
