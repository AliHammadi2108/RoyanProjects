'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { saveThemeSettingsAction } from '@/actions/theme';
import {
  THEME_OPTIONS,
  THEME_PRESETS,
  applyThemeToDocument,
  getUserThemeSettings,
  isValidHexColor,
  type ThemePreference,
} from '@/lib/theme';

type AppearanceSettingsClientProps = {
  initial: {
    themePreference: ThemePreference;
    primaryColor: string;
  };
};

export function AppearanceSettingsClient({ initial }: AppearanceSettingsClientProps) {
  const { update } = useSession();
  const [themePreference, setThemePreference] = useState<ThemePreference>(initial.themePreference);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    applyThemeToDocument(getUserThemeSettings(themePreference, primaryColor));
  }, [themePreference, primaryColor]);

  const handlePreset = (color: string) => {
    setPrimaryColor(color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!isValidHexColor(primaryColor)) {
      setError('اللون الرئيسي غير صالح');
      setLoading(false);
      return;
    }

    try {
      const result = await saveThemeSettingsAction({ themePreference, primaryColor });
      await update({
        themePreference: result.themePreference,
        primaryColor: result.primaryColor,
      });
      setSuccess('تم حفظ إعدادات المظهر بنجاح');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="إعدادات المظهر" subtitle="تخصيص ثيم النظام واللون الرئيسي لحسابك" />
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

          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <label className="form-label">اختيار الثيم</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                {THEME_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      themePreference === opt.value
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="themePreference"
                      value={opt.value}
                      checked={themePreference === opt.value}
                      onChange={() => setThemePreference(opt.value)}
                      className="text-primary-600"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">اللون الرئيسي</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePreset(preset.color)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      primaryColor.toLowerCase() === preset.color
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: preset.color }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  aria-label="اختيار لون مخصص"
                />
                <input
                  type="text"
                  className="form-input max-w-[140px] font-mono"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  dir="ltr"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label className="form-label">معاينة</label>
              <div className="rounded-lg border border-gray-200 overflow-hidden mt-2">
                <div
                  className="p-4 flex items-center justify-between"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white font-medium text-sm">شريط علوي</span>
                  <span className="text-white/80 text-xs">معاينة اللون</span>
                </div>
                <div className="p-4 bg-[var(--surface-card)] space-y-2">
                  <div className="flex gap-2">
                    <span className="btn-primary text-xs px-3 py-1.5">زر رئيسي</span>
                    <span className="btn-secondary text-xs px-3 py-1.5">زر ثانوي</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    هكذا ستظهر عناصر الواجهة بعد تطبيق الإعدادات.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </form>
        </div>
      </PageContainer>
    </>
  );
}
