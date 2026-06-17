'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { ShoppingCart } from 'lucide-react';

const DEMO_USERS = [
  { username: 'admin', label: 'مدير النظام', password: 'admin123' },
  { username: 'requester', label: 'مقدم طلب', password: 'requester123' },
  { username: 'purchasing_officer', label: 'موظف مشتريات', password: 'officer123' },
  { username: 'approver', label: 'معتمد', password: 'approver123' },
  { username: 'warehouse_user', label: 'مستخدم مخزن', password: 'warehouse123' },
  { username: 'finance_user', label: 'مستخدم مالية', password: 'finance123' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };

  const quickLogin = (user: typeof DEMO_USERS[0]) => {
    setUsername(user.username);
    setPassword(user.password);
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
            <label className="form-label">اسم المستخدم</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
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
              dir="ltr"
            />
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

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-3">دخول سريع (بيانات تجريبية)</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.username}
                type="button"
                onClick={() => quickLogin(user)}
                className="text-xs px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                {user.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
