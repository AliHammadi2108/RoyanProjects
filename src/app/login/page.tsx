'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  ShoppingCart,
  Truck,
  ClipboardList,
  BarChart3,
  Package,
  FileSpreadsheet,
} from 'lucide-react';
import { getRememberedUserNo, setRememberedUserNo } from '@/lib/remember-user';

const WATERMARK_ICONS = [
  { Icon: ClipboardList, className: 'top-[12%] left-[8%] w-16 h-16' },
  { Icon: ShoppingCart, className: 'top-[20%] right-[12%] w-20 h-20' },
  { Icon: Truck, className: 'bottom-[28%] left-[14%] w-14 h-14' },
  { Icon: Package, className: 'bottom-[18%] right-[18%] w-16 h-16' },
  { Icon: BarChart3, className: 'top-[45%] left-[22%] w-12 h-12' },
  { Icon: FileSpreadsheet, className: 'top-[38%] right-[8%] w-14 h-14' },
];

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Background cover */}
      <div
        className="absolute inset-0 bg-gradient-to-bl from-primary-800 via-primary-700 to-teal-800"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-30 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: 'url(/login-cover.svg)' }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      {WATERMARK_ICONS.map(({ Icon, className }, i) => (
        <Icon
          key={i}
          className={`absolute text-white/10 pointer-events-none ${className}`}
          strokeWidth={1.25}
          aria-hidden
        />
      ))}

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 p-6 lg:p-12">
        {/* Hero text — visible on larger screens */}
        <div className="hidden lg:flex flex-col max-w-md text-white text-center lg:text-right">
          <div className="inline-flex items-center justify-center lg:justify-start gap-3 mb-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <ShoppingCart className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-3xl font-bold leading-snug mb-3">
            نظام إدارة ومتابعة عمليات الشراء
          </h2>
          <p className="text-white/80 text-base leading-relaxed">
            تتبع دورة المشتريات من طلب الشراء وحتى الفاتورة والدفع — بإدارة موحّدة
            للموردين والمخزون والاعتمادات.
          </p>
          <div className="flex flex-wrap gap-3 mt-8 justify-center lg:justify-start">
            {['طلبات الشراء', 'أوامر الشراء', 'الفواتير', 'التقارير'].map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-8 border border-white/40">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <ShoppingCart className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
            <p className="text-gray-500 mt-2 text-sm">نظام متابعة المشتريات</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">رقم المستخدم</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-input text-center tabular-nums"
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
    </div>
  );
}
