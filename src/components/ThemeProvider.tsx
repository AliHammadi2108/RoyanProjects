'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  applyThemeToDocument,
  getUserThemeSettings,
  type ThemePreference,
} from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const themePreference = (session?.user as { themePreference?: ThemePreference } | undefined)
    ?.themePreference;
  const primaryColor = (session?.user as { primaryColor?: string } | undefined)?.primaryColor;

  useEffect(() => {
    const settings = getUserThemeSettings(themePreference, primaryColor);
    applyThemeToDocument(settings);

    if (settings.themePreference !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeToDocument(settings);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themePreference, primaryColor]);

  return <>{children}</>;
}
