'use client';

import { useEffect, useState, useTransition } from 'react';
import { ChevronDown, Loader2, MessageCircle, X } from 'lucide-react';
import { sendWhatsAppMessageAction, getWhatsAppApiStatus } from '@/actions/whatsapp';
import { buildWhatsAppUrl, normalizePhoneToE164, openWhatsAppUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPhone(defaultPhone || '');
  }, [defaultPhone]);

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
          <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
            <strong>الإرسال اليدوي</strong> يفتح تطبيق واتساب ويعمل <strong>بدون أي إعداد</strong> أو
            مفاتيح API.
          </div>

          <div>
            <label className="form-label" htmlFor="wa-phone">
              رقم المستلم
            </label>
            <input
              id="wa-phone"
              type="tel"
              dir="ltr"
              className="form-input text-left"
              placeholder="+967773084555"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              أدخل الرقم مع رمز الدولة. مثال: +967773084555 أو 0773084555
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

          <div className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <span>إعداد متقدم — إرسال تلقائي (اختياري)</span>
              <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', showAdvanced && 'rotate-180')} />
            </button>
            {showAdvanced ? (
              <div className="px-3 pb-3 pt-1 text-sm text-gray-600 space-y-2 border-t border-gray-100">
                <p>
                  الإرسال التلقائي يرسل الرسالة من الخادم مباشرة دون فتح واتساب، ويتطلب إعداد
                  WhatsApp Cloud API في ملف <code dir="ltr">.env</code> على الخادم.
                </p>
                {!apiConfigured ? (
                  <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                    الإرسال التلقائي غير مفعّل حالياً. يمكنك استخدام زر «فتح واتساب» أعلاه دون أي
                    إعداد.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-t">
          <button
            type="button"
            onClick={handleManual}
            disabled={!phoneValid}
            className="btn-primary flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700"
          >
            فتح واتساب
          </button>
          {showAdvanced && apiConfigured ? (
            <button
              type="button"
              onClick={handleAutoSend}
              disabled={!phoneValid || isPending}
              className="btn-secondary flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              إرسال تلقائي
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
            إلغاء
          </button>
          <p className="text-xs text-gray-500 w-full">
            الإرسال اليدوي يعمل بدون إعداد. للإرسال التلقائي فقط: راجع إعدادات الخادم (.env).
          </p>
        </div>
      </div>
    </div>
  );
}
