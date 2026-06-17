'use client';

import { useEffect, useState } from 'react';
import { cn, formatDateTime } from '@/lib/utils';

interface LiveDateTimeProps {
  className?: string;
  /** Update interval in ms; default 1s for live seconds */
  intervalMs?: number;
}

export function LiveDateTime({ className, intervalMs = 1000 }: LiveDateTimeProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  if (!now) return null;

  return (
    <time
      dateTime={now.toISOString()}
      className={cn('text-xs text-gray-500 tabular-nums whitespace-nowrap', className)}
      suppressHydrationWarning
    >
      {formatDateTime(now)}
    </time>
  );
}
