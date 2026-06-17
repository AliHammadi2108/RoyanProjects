'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { changePasswordAction } from '@/actions/password';
import { updateOwnPhoneAction } from '@/actions/profile';

interface ChangePasswordClientProps {
  initialPhone?: string;
}

export function ChangePasswordClient({ initialPhone = '' }: ChangePasswordClientProps) {
  const { update: updateSession } = useSession();
  const [phone, setPhone] = useState(initialPhone);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [success, setSuccess] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');

  const handlePhoneSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    setPhoneError('');
    setPhoneSuccess('');
    try {
      const result = await updateOwnPhoneAction({ phone });
      setPhone(result.phone || '');
      await updateSession({ phone: result.phone || '' });
      setPhoneSuccess('تم حفظ رقم الواتساب بنجاح');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'فشل حفظ رقم الهاتف');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await changePasswordAction(form);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('تم تغيير كلمة المرور بنجاح');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title="الملف الشخصي"
        subtitle="رقم الواتساب وكلمة مرور حسابك"
      />
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-6">
          <form onSubmit={handlePhoneSave} className="card space-y-4">
            <h3 className="font-semibold text-gray-900">رقم الواتساب</h3>
            <p className="text-sm text-gray-500">
              يُستخدم كمستلم افتراضي عند إرسال تقارير العمليات والتنبيهات عبر واتساب.
            </p>
            {phoneError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">
                {phoneError}
              </div>
            )}
            {phoneSuccess && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-sm">
                {phoneSuccess}
              </div>
            )}
            <div>
              <label className="form-label" htmlFor="phone">
                رقم الهاتف (مع رمز الدولة)
              </label>
              <input
                id="phone"
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+967773084555"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">
                مثال: +967773084555 أو 966501234567
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary" disabled={phoneLoading}>
                {phoneLoading ? 'جاري الحفظ...' : 'حفظ رقم الواتساب'}
              </button>
            </div>
          </form>

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

          <form onSubmit={handleSubmit} className="card space-y-4">
            <h3 className="font-semibold text-gray-900">تغيير كلمة المرور</h3>
            <div>
              <label className="form-label" htmlFor="currentPassword">
                كلمة المرور الحالية *
              </label>
              <input
                id="currentPassword"
                type="password"
                className="form-input"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="newPassword">
                كلمة المرور الجديدة *
              </label>
              <input
                id="newPassword"
                type="password"
                className="form-input"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">6 أحرف على الأقل</p>
            </div>
            <div>
              <label className="form-label" htmlFor="confirmPassword">
                تأكيد كلمة المرور الجديدة *
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
              </button>
            </div>
          </form>
        </div>
      </PageContainer>
    </>
  );
}
