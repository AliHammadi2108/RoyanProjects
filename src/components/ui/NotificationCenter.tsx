'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, X, AlertTriangle } from 'lucide-react';
import {
  fetchDropdownNotifications,
  fetchUnreadCount,
  dismissHeaderNotification,
} from '@/actions/common';
import { formatDateTime } from '@/lib/utils';

const LOGIN_MODAL_SEEN_KEY = 'notification-login-modal-seen-ids';

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  isRead?: boolean;
  createdAt: string;
  actionUrl?: string | null;
  route?: string | null;
}

interface NotificationCenterProps {
  initialUnread?: number;
}

function normalizeNotifications(
  notifications: Array<Record<string, unknown> & { createdAt: Date | string }>
): NotificationRow[] {
  return notifications.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? ''),
    message: String(n.message ?? ''),
    priority: String(n.priority ?? 'Normal'),
    status: String(n.status ?? ''),
    isRead: Boolean(n.isRead),
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : n.createdAt.toISOString(),
    actionUrl: (n.actionUrl as string | null | undefined) ?? null,
    route: (n.route as string | null | undefined) ?? null,
  }));
}

function getLoginModalSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(LOGIN_MODAL_SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function rememberLoginModalSeenIds(ids: string[]) {
  if (typeof window === 'undefined' || ids.length === 0) return;
  const seen = getLoginModalSeenIds();
  ids.forEach((id) => seen.add(id));
  sessionStorage.setItem(LOGIN_MODAL_SEEN_KEY, JSON.stringify(Array.from(seen)));
}

export function NotificationCenter({ initialUnread = 0 }: NotificationCenterProps) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginItems, setLoginItems] = useState<NotificationRow[]>([]);

  const loadUnread = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnread(count);
    } catch {
      // ignore polling errors
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { notifications } = await fetchDropdownNotifications();
      setItems(normalizeNotifications(notifications));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { notifications } = await fetchDropdownNotifications();
        const unreadList = normalizeNotifications(notifications);
        const seenIds = getLoginModalSeenIds();
        const freshForModal = unreadList.filter((n) => !seenIds.has(n.id));
        if (!cancelled && freshForModal.length > 0) {
          setLoginItems(freshForModal);
          setShowLoginModal(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  const dismissLocally = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    setLoginItems((prev) => prev.filter((n) => n.id !== id));
    setUnread((c) => Math.max(0, c - 1));
  };

  const navigate = async (n: NotificationRow) => {
    dismissLocally(n.id);
    rememberLoginModalSeenIds([n.id]);
    setOpen(false);
    setShowLoginModal(false);

    try {
      await dismissHeaderNotification(n.id);
    } catch {
      // restore on failure
      await loadNotifications();
      await loadUnread();
    }

    const href = n.route || n.actionUrl || '/notifications';
    router.push(href);
    router.refresh();
  };

  const handleDismissLoginModal = () => {
    rememberLoginModalSeenIds(loginItems.map((n) => n.id));
    setShowLoginModal(false);
  };

  const highPriorityLogin = loginItems.filter((n) => n.priority === 'High');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="التنبيهات"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-16 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-gray-900">مركز التنبيهات</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {loading ? (
                <p className="text-center text-gray-500 py-8 text-sm">جاري التحميل...</p>
              ) : items.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">لا توجد تنبيهات جديدة</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => navigate(n)}
                        className="w-full text-right p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          {n.priority === 'High' && (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{n.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-3 border-t border-gray-100">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                عرض الكل
              </Link>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && loginItems.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-6 h-6 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">تنبيهات جديدة</h2>
            </div>
            {highPriorityLogin.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-900">
                لديك {highPriorityLogin.length} تنبيه عالي الأولوية يتطلب انتباهك
              </div>
            )}
            <ul className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {loginItems.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => navigate(n)}
                    className="w-full text-right p-2 rounded-lg hover:bg-gray-50 border border-gray-100 text-sm"
                  >
                    <span className="font-medium">{n.title}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{n.message}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Link
                href="/notifications"
                className="btn-primary flex-1 text-center"
                onClick={() => {
                  rememberLoginModalSeenIds(loginItems.map((n) => n.id));
                  setShowLoginModal(false);
                  setOpen(false);
                }}
              >
                عرض الكل
              </Link>
              <button type="button" className="btn-secondary flex-1" onClick={handleDismissLoginModal}>
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
