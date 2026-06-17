'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchBox, SearchEmptyState } from '@/components/ui/SearchBox';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';
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
  route?: string | null;
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
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => clientSearchMapped(initialData as unknown as Record<string, unknown>[], search, SEARCH_MAPPINGS.notification),
    [initialData, search]
  );

  const handleClick = async (notification: NotificationItem) => {
    if (notification.status === 'Unread') {
      await readNotification(notification.id);
    }
    const href = notification.route || notification.actionUrl;
    if (href) {
      router.push(href);
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
        <div className="card mb-4">
          <SearchBox value={search} onChange={setSearch} placeholder="بحث بالعنوان أو المحتوى..." />
        </div>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card text-center py-8 text-gray-500 text-sm">
              <SearchEmptyState query={search} message="لا توجد تنبيهات مطابقة" />
              {!search && 'لا توجد تنبيهات'}
            </div>
          ) : (
            filtered.map((row) => {
              const notification = row as unknown as NotificationItem;
              return (
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
            );
            })
          )}
        </div>
      </PageContainer>
    </>
  );
}
