'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { changePasswordAction } from '@/actions/password';

export function ChangePasswordClient() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      <Header title="تغيير كلمة المرور" subtitle="تحديث كلمة مرور حسابك الحالي" />
      <PageContainer>
        <div className="max-w-lg mx-auto">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 text-sm mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4">
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
