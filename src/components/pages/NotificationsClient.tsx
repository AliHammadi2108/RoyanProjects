'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { readNotification, readAllNotifications } from '@/actions/common';
import { DOCUMENT_LABELS_AR } from '@/lib/constants';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  documentType?: string | null;
  status: string;
  actionUrl?: string | null;
  createdAt: string;
  user?: { nameAr: string; username: string };
}

export function NotificationsClient({
  initialData,
  isAdmin = false,
}: {
  initialData: NotificationItem[];
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const handleClick = async (notification: NotificationItem) => {
    if (notification.status === 'Unread') {
      await readNotification(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    await readAllNotifications();
    router.refresh();
  };

  return (
    <>
      <Header
        title="التنبيهات"
        subtitle={isAdmin ? 'جميع تنبيهات النظام (عرض المدير)' : 'إشعارات النظام والاعتمادات'}
        actions={
          initialData.some((n) => n.status === 'Unread') ? (
            <button onClick={handleMarkAllRead} className="btn-secondary text-sm">
              تحديد الكل كمقروء
            </button>
          ) : undefined
        }
      />
      <PageContainer>
        <div className="space-y-3">
          {initialData.length === 0 ? (
            <div className="card text-center py-8 text-gray-500 text-sm">لا توجد تنبيهات</div>
          ) : (
            initialData.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`card cursor-pointer transition-colors hover:bg-gray-50 ${
                  notification.status === 'Unread' ? 'border-r-4 border-r-primary-500 bg-primary-50/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{notification.title}</h3>
                      <StatusBadge status={notification.status} />
                    </div>
                    <p className="text-sm text-gray-600">{notification.message}</p>
                    {isAdmin && notification.user && (
                      <p className="text-xs text-primary-600 mt-1">
                        المستخدم: {notification.user.nameAr} ({notification.user.username})
                      </p>
                    )}
                    {notification.documentType && (
                      <p className="text-xs text-gray-400 mt-1">
                        {DOCUMENT_LABELS_AR[notification.documentType] || notification.documentType}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDateTime(notification.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </PageContainer>
    </>
  );
}
