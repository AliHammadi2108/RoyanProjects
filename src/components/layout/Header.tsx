'use client';

import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { CurrentUserDisplay } from '@/components/layout/CurrentUserDisplay';

interface HeaderProps {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, unreadCount = 0, actions }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        <CurrentUserDisplay compact showDateTime />
        <NotificationCenter initialUnread={unreadCount} />
      </div>
    </header>
  );
}