'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { ShoppingCart } from 'lucide-react';
import { getRememberedUserNo, setRememberedUserNo } from '@/lib/remember-user';

export default function LoginPage() {
  const [userNo, setUserNo] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = getRememberedUserNo();
    if (saved) {
      setUserNo(saved);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!userNo.trim()) {
      setError('رقم المستخدم مطلوب');
      setLoading(false);
      return;
    }
    if (!/^\d+$/.test(userNo.trim())) {
      setError('رقم المستخدم يجب أن يكون أرقاماً فقط');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('كلمة المرور مطلوبة');
      setLoading(false);
      return;
    }

    if (remember) setRememberedUserNo(userNo.trim());
    else setRememberedUserNo('');

    const result = await signIn('credentials', {
      userNo: userNo.trim(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('رقم المستخدم أو كلمة المرور غير صحيحة');
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <ShoppingCart className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">نظام إدارة ومتابعة عمليات الشراء</h1>
          <p className="text-gray-500 mt-2 text-sm">تسجيل الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">رقم المستخدم</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-input"
              value={userNo}
              onChange={(e) => setUserNo(e.target.value.replace(/\D/g, ''))}
              placeholder="1"
              required
              autoComplete="username"
              dir="ltr"
            />
          </div>
          <div>
            <label className="form-label">كلمة المرور</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember" className="text-sm text-gray-600">
              تذكر رقم المستخدم
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
