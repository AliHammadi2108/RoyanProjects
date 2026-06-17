'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Copy, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildWhatsAppUrl,
  copyTextToClipboard,
  openWhatsAppUrl,
} from '@/lib/whatsapp';
import { WhatsAppSendModal } from './WhatsAppSendModal';

export interface WhatsAppShareButtonProps {
  message: string;
  defaultPhone?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  showAutoSend?: boolean;
  attachNote?: string;
}

export function WhatsAppShareButton({
  message,
  defaultPhone,
  disabled = false,
  disabledReason,
  label = 'واتساب',
  size = 'sm',
  className,
  showAutoSend = true,
  attachNote,
}: WhatsAppShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fullMessage = attachNote ? `${message}\n\n_${attachNote}_` : message;

  const handleManualSend = useCallback(() => {
    setOpen(false);
    const url = buildWhatsAppUrl(fullMessage, defaultPhone);
    openWhatsAppUrl(url);
  }, [fullMessage, defaultPhone]);

  const handleCopy = useCallback(async () => {
    setOpen(false);
    const ok = await copyTextToClipboard(fullMessage);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [fullMessage]);

  const sizeClass = size === 'sm' ? 'text-sm px-3 py-1.5' : 'text-sm px-4 py-2';

  return (
    <>
      <div className={cn('relative inline-flex', className)} ref={menuRef}>
        <button
          type="button"
          disabled={disabled}
          title={disabled ? disabledReason : 'إرسال عبر واتساب'}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'btn-secondary inline-flex items-center gap-1.5',
            sizeClass,
            'border-green-200 text-green-800 hover:bg-green-50 hover:border-green-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          {label}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </button>

        {open && !disabled ? (
          <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={handleManualSend}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Send className="w-4 h-4 text-green-600 shrink-0" />
              إرسال يدوي (يفتح واتساب)
            </button>
            {showAutoSend ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
                إرسال برقم محدد
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Copy className="w-4 h-4 shrink-0" />
              {copied ? 'تم النسخ!' : 'نسخ النص'}
            </button>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <WhatsAppSendModal
          message={fullMessage}
          defaultPhone={defaultPhone}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}
