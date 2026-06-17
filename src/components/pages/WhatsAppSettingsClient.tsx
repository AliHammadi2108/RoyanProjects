'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Loader2, MessageCircle, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  getWhatsAppSettingsStatus,
  setWhatsAppAutoNotifyAction,
  testWhatsAppConnectionAction,
  type WhatsAppSettingsStatus,
} from '@/actions/whatsapp';

type WhatsAppSettingsClientProps = {
  initial: WhatsAppSettingsStatus;
};

export function WhatsAppSettingsClient({ initial }: WhatsAppSettingsClientProps) {
  const { data: session } = useSession();
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  const refreshStatus = () => {
    startTransition(async () => {
      const next = await getWhatsAppSettingsStatus();
      if (next) setStatus(next);
    });
  };

  const handleToggleAuto = () => {
    setError('');
    setSuccess('');
    const next = !status.autoNotify;
    startTransition(async () => {
      const result = await setWhatsAppAutoNotifyAction(next);
      if (result.success) {
        setStatus((s) => ({ ...s, autoNotify: next }));
        setSuccess(
          result.restartRequired
            ? 'تم حفظ الإعداد — أعد تشغيل النظام (pm2 restart) لتطبيق التغيير بالكامل'
            : 'تم حفظ الإعداد'
        );
      } else {
        setError(result.error || 'فشل حفظ الإعداد');
      }
    });
  };

  const handleTest = () => {
    setError('');
    setSuccess('');
    startTransition(async () => {
      const result = await testWhatsAppConnectionAction();
      if (result.success) {
        setSuccess(`تم إرسال رسالة الاختبار إلى ${session?.user?.phone || 'رقمك'}`);
      } else {
        setError(result.error || 'فشل اختبار الاتصال');
      }
    });
  };

  return (
    <>
      <Header
        title="إعدادات واتساب"
        subtitle="الإرسال التلقائي عبر WhatsApp Cloud API (Meta)"
      />
      <PageContainer>
        <div className="max-w-2xl mx-auto space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-sm">
              {success}
            </div>
          )}

          <section className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <h2 className="font-bold text-gray-900">حالة الاتصال</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatusCard
                label="WhatsApp Cloud API"
                ok={status.configured}
                okText="مُعدّ ويعمل"
                failText="غير مُعدّ"
              />
              <StatusCard
                label="الإرسال التلقائي"
                ok={status.autoNotify}
                okText="مفعّل"
                failText="معطّل"
              />
            </div>

            <dl className="text-sm space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">رمز الدولة الافتراضي</dt>
                <dd className="font-mono" dir="ltr">
                  +{status.defaultCountryCode}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">معرّف رقم واتساب (Phone Number ID)</dt>
                <dd className="font-mono text-left" dir="ltr">
                  {status.phoneNumberIdMasked ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">رمز الوصول (Token)</dt>
                <dd>{status.tokenConfigured ? 'مُعرَّف في .env' : 'غير مُعرَّف'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">رقمك للاختبار</dt>
                <dd className="font-mono text-left" dir="ltr">
                  {session?.user?.phone || '— أضف رقماً من الملف الشخصي'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-900">الإرسال التلقائي للتنبيهات</h2>
            <p className="text-sm text-gray-600">
              عند التفعيل، يُرسل النظام رسالة واتساب تلقائياً عند إنشاء تنبيه (اعتماد، حد طلب،
              إلخ) إلى رقم الهاتف المسجّل للمستخدم المستهدف.
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={status.autoNotify}
                disabled={!status.configured || isPending}
                onChange={handleToggleAuto}
              />
              <span className="text-sm font-medium text-gray-800">
                تفعيل WHATSAPP_AUTO_NOTIFY
              </span>
            </label>
            {!status.configured && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                يجب إعداد مفاتيح API في ملف .env قبل تفعيل الإرسال التلقائي.
              </p>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-900">مفاتيح API (ملف .env فقط)</h2>
            <p className="text-sm text-gray-600">
              لأسباب أمنية، تُخزَّن مفاتيح Meta في ملف <code dir="ltr">.env</code> على الخادم
              ولا تُحفظ في قاعدة البيانات. راجع الدليل في المشروع:
              <span className="font-mono text-xs block mt-1" dir="ltr">
                docs/WHATSAPP-SETUP.md
              </span>
            </p>

            <pre
              className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-left"
              dir="ltr"
            >
{`WHATSAPP_CLOUD_API_TOKEN="EAAxxxx..."
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_AUTO_NOTIFY="true"
WHATSAPP_DEFAULT_COUNTRY_CODE="967"
WHATSAPP_DEFAULT_RECIPIENT=""`}
            </pre>
            <p className="text-xs text-gray-500">
              بعد التعديل: <code dir="ltr">npm run pm2:restart</code> أو{' '}
              <code dir="ltr">scripts\\restart-system.bat</code>
            </p>
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-900">اختبار الاتصال</h2>
            <p className="text-sm text-gray-600">
              يُرسل رسالة تجريبية إلى رقم هاتفك المسجّل في النظام (
              {session?.user?.phone ? (
                <span className="font-mono" dir="ltr">
                  {session.user.phone}
                </span>
              ) : (
                'غير محدد'
              )}
              ).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={!status.configured || isPending}
                className="btn-primary inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                إرسال رسالة اختبار
              </button>
              <button
                type="button"
                onClick={refreshStatus}
                disabled={isPending}
                className="btn-secondary"
              >
                تحديث الحالة
              </button>
            </div>
          </section>

          <section className="card p-5 space-y-2 text-sm text-gray-600">
            <h2 className="font-bold text-gray-900">ملاحظات</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>الإرسال اليدوي عبر wa.me يعمل دائماً بدون API.</li>
              <li>
                الإرسال التلقائي يتطلب رقم هاتف صحيح (+967...) لكل مستخدم يستقبل التنبيهات.
              </li>
              <li>
                <code dir="ltr">WHATSAPP_PHONE_NUMBER_ID</code> هو معرّف Meta وليس رقم الهاتف.
              </li>
            </ul>
          </section>
        </div>
      </PageContainer>
    </>
  );
}

function StatusCard({
  label,
  ok,
  okText,
  failText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-3 ${
        ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
      )}
      <div>
        <p className="text-xs text-gray-600">{label}</p>
        <p className={`text-sm font-semibold ${ok ? 'text-green-800' : 'text-red-800'}`}>
          {ok ? okText : failText}
        </p>
      </div>
    </div>
  );
}
