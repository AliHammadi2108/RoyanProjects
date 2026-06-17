'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface NotificationContextValue {
  unread: number;
  setUnread: (count: number) => void;
  bumpUnread: (delta: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  initialUnread,
  children,
}: {
  initialUnread: number;
  children: React.ReactNode;
}) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  const bumpUnread = useCallback((delta: number) => {
    setUnread((current) => Math.max(0, current + delta));
  }, []);

  const value = useMemo(
    () => ({ unread, setUnread, bumpUnread }),
    [unread, bumpUnread]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotificationUnread() {
  const ctx = useContext(NotificationContext);
  return ctx?.unread ?? 0;
}

export function useNotificationActions() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      setUnread: (_count: number) => {},
      bumpUnread: (_delta: number) => {},
    };
  }
  return { setUnread: ctx.setUnread, bumpUnread: ctx.bumpUnread };
}
