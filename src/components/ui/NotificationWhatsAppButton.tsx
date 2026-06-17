'use client';

import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { WhatsAppShareButton } from '@/components/ui/WhatsAppShareButton';
import { getWhatsAppDefaultPhone } from '@/actions/whatsapp';
import { buildAbsoluteUrl, formatNotificationMessage, resolveDefaultWhatsAppPhone } from '@/lib/whatsapp';
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
  const { data: session } = useSession();
  const userPhone = (session?.user as { phone?: string } | undefined)?.phone;
  const [serverPhone, setServerPhone] = useState<string | null>(null);

  useEffect(() => {
    getWhatsAppDefaultPhone().then(setServerPhone);
  }, []);

  const defaultPhone = useMemo(
    () => resolveDefaultWhatsAppPhone(null, userPhone) ?? serverPhone,
    [userPhone, serverPhone]
  );

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
        defaultPhone={defaultPhone}
        label="واتساب"
        disabled={disabled}
        size="sm"
      />
    </span>
  );
}
