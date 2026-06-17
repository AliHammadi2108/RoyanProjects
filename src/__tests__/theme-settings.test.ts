import { describe, it, expect } from 'vitest';
import { themeSettingsSchema } from '@/lib/theme-schema';
import {
  generatePrimaryShades,
  getUserThemeSettings,
  isValidHexColor,
  normalizePrimaryColor,
  resolveThemeMode,
} from '@/lib/theme';
import { getScreenPermissionForPath } from '@/lib/screen-access';

describe('theme settings', () => {
  it('validates theme settings input', () => {
    const result = themeSettingsSchema.safeParse({
      themePreference: 'dark',
      primaryColor: '#16a34a',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    const result = themeSettingsSchema.safeParse({
      themePreference: 'light',
      primaryColor: 'blue',
    });
    expect(result.success).toBe(false);
  });

  it('normalizes missing user theme to defaults', () => {
    const settings = getUserThemeSettings(null, null);
    expect(settings.themePreference).toBe('system');
    expect(settings.primaryColor).toBe('#2563eb');
  });

  it('generates primary color shades from hex', () => {
    const shades = generatePrimaryShades('#2563eb');
    expect(shades['600']).toBe('37 99 235');
    expect(shades['50']).toBeTruthy();
    expect(shades['900']).toBeTruthy();
  });

  it('validates hex colors', () => {
    expect(isValidHexColor('#2563eb')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(false);
    expect(normalizePrimaryColor('invalid')).toBe('#2563eb');
  });

  it('resolves theme mode from preference', () => {
    expect(resolveThemeMode('light')).toBe('light');
    expect(resolveThemeMode('dark')).toBe('dark');
  });

  it('maps appearance settings screen to permission', () => {
    expect(getScreenPermissionForPath('/settings/appearance')).toBe('profile.theme.view');
  });
});
