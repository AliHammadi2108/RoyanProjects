'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, MessageCircle, X } from 'lucide-react';
import { sendWhatsAppMessageAction, getWhatsAppApiStatus } from '@/actions/whatsapp';
import { buildWhatsAppUrl, normalizePhoneToE164, openWhatsAppUrl } from '@/lib/whatsapp';

interface WhatsAppSendModalProps {
  message: string;
  defaultPhone?: string | null;
  onClose: () => void;
}

export function WhatsAppSendModal({
  message,
  defaultPhone,
  onClose,
}: WhatsAppSendModalProps) {
  const [phone, setPhone] = useState(defaultPhone || '');
  const [apiConfigured, setApiConfigured] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getWhatsAppApiStatus().then((s) => setApiConfigured(s.configured));
  }, []);

  const preview = message.length > 500 ? `${message.slice(0, 500)}…` : message;
  const phoneValid = Boolean(normalizePhoneToE164(phone));

  const handleManual = () => {
    openWhatsAppUrl(buildWhatsAppUrl(message, phone));
    onClose();
  };

  const handleAutoSend = () => {
    setError('');
    setSuccess('');
    startTransition(async () => {
      const result = await sendWhatsAppMessageAction(phone, message);
      if (result.success) {
        setSuccess('تم الإرسال عبر واتساب بنجاح');
        setTimeout(onClose, 1200);
      } else {
        setError(result.error || 'فشل الإرسال');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        role="dialog"
        aria-labelledby="whatsapp-modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <h2 id="whatsapp-modal-title" className="font-bold text-gray-900">
              إرسال عبر واتساب
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="form-label" htmlFor="wa-phone">
              رقم المستلم (E.164)
            </label>
            <input
              id="wa-phone"
              type="tel"
              dir="ltr"
              className="form-input text-left"
              placeholder="+966501234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              أدخل الرقم مع رمز الدولة. مثال: 966501234567 أو 0501234567
            </p>
          </div>

          <div>
            <p className="form-label">معاينة الرسالة</p>
            <pre className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-right max-h-48 overflow-y-auto font-sans">
              {preview}
            </pre>
          </div>

          {error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
              {success}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-t">
          <button
            type="button"
            onClick={handleManual}
            disabled={!phoneValid}
            className="btn-secondary flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5"
          >
            فتح واتساب
          </button>
          {apiConfigured ? (
            <button
              type="button"
              onClick={handleAutoSend}
              disabled={!phoneValid || isPending}
              className="btn-primary flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              إرسال تلقائي
            </button>
          ) : (
            <p className="text-xs text-gray-500 w-full">
              الإرسال التلقائي غير مفعّل — أضف مفاتيح WhatsApp Cloud API في ملف .env
            </p>
          )}
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
