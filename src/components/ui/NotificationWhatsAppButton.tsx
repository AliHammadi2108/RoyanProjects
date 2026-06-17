'use client';

import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { WhatsAppShareButton } from '@/components/ui/WhatsAppShareButton';
import { buildAbsoluteUrl, formatNotificationMessage } from '@/lib/whatsapp';
import { formatDateTime } from '@/lib/utils';

interface NotificationWhatsAppButtonProps {
  title: string;
  message: string;
  route?: string | null;
  actionUrl?: string | null;
  createdAt?: string;
  disabled?: boolean;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

export function NotificationWhatsAppButton({
  title,
  message,
  route,
  actionUrl,
  createdAt,
  disabled,
  className,
  onClick,
}: NotificationWhatsAppButtonProps) {
  const text = useMemo(() => {
    const href = route || actionUrl;
    const link = href ? buildAbsoluteUrl(href) : undefined;
    return formatNotificationMessage({
      title,
      message,
      link,
      createdAt: createdAt ? formatDateTime(createdAt) : undefined,
    });
  }, [title, message, route, actionUrl, createdAt]);

  return (
    <span
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <WhatsAppShareButton
        message={text}
        label="واتساب"
        disabled={disabled}
        size="sm"
      />
    </span>
  );
}
