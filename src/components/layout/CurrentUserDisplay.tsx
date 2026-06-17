'use client';

import { useSession } from 'next-auth/react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveDateTime } from '@/components/layout/LiveDateTime';

interface CurrentUserDisplayProps {
  compact?: boolean;
  /** Show live date/time beside user number (header only) */
  showDateTime?: boolean;
  className?: string;
}

function resolveDisplayName(user: {
  name?: string | null;
  nameAr?: string;
  username?: string;
}) {
  return user.nameAr || user.name || user.username || 'مستخدم';
}

export function CurrentUserDisplay({
  compact = false,
  showDateTime = false,
  className,
}: CurrentUserDisplayProps) {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === 'loading' || !user) {
    return null;
  }

  const displayName = resolveDisplayName(user);
  const userNo = user.userNo;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 min-w-0', className)}>
        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>
        <div className="text-right min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
          {(userNo || showDateTime) && (
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              {userNo && <p className="text-xs text-gray-500 shrink-0">رقم {userNo}</p>}
              {showDateTime && userNo && (
                <span className="text-gray-300 text-xs select-none" aria-hidden>
                  |
                </span>
              )}
              {showDateTime && <LiveDateTime className="shrink-0" />}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100',
        className
      )}
    >
      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
        <User className="w-4 h-4" />
      </div>
      <div className="flex-1 text-right min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
        {userNo ? (
          <p className="text-xs text-gray-500">رقم المستخدم: {userNo}</p>
        ) : user.username ? (
          <p className="text-xs text-gray-500">@{user.username}</p>
        ) : null}
      </div>
    </div>
  );
}
