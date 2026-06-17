export type ThemePreference = 'light' | 'dark' | 'system';

export const DEFAULT_PRIMARY_COLOR = '#2563eb';

export const THEME_PRESETS = [
  { id: 'blue', label: 'أزرق', color: '#2563eb' },
  { id: 'green', label: 'أخضر', color: '#16a34a' },
  { id: 'purple', label: 'بنفسجي', color: '#7c3aed' },
  { id: 'teal', label: 'تركواز', color: '#0d9488' },
  { id: 'orange', label: 'برتقالي', color: '#ea580c' },
  { id: 'rose', label: 'وردي', color: '#e11d48' },
] as const;

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'فاتح' },
  { value: 'dark', label: 'داكن' },
  { value: 'system', label: 'تلقائي (حسب النظام)' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const n = parseInt(normalized, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixRgb(
  r: number,
  g: number,
  b: number,
  targetR: number,
  targetG: number,
  targetB: number,
  amount: number
): string {
  const t = Math.min(1, Math.max(0, amount));
  const nr = Math.round(r + (targetR - r) * t);
  const ng = Math.round(g + (targetG - g) * t);
  const nb = Math.round(b + (targetB - b) * t);
  return `${nr} ${ng} ${nb}`;
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function normalizePrimaryColor(color?: string | null): string {
  if (color && isValidHexColor(color)) return color.toLowerCase();
  return DEFAULT_PRIMARY_COLOR;
}

export function generatePrimaryShades(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return generatePrimaryShades(DEFAULT_PRIMARY_COLOR);
  }
  const { r, g, b } = rgb;
  return {
    '50': mixRgb(r, g, b, 255, 255, 255, 0.92),
    '100': mixRgb(r, g, b, 255, 255, 255, 0.84),
    '200': mixRgb(r, g, b, 255, 255, 255, 0.68),
    '300': mixRgb(r, g, b, 255, 255, 255, 0.52),
    '400': mixRgb(r, g, b, 255, 255, 255, 0.28),
    '500': mixRgb(r, g, b, 255, 255, 255, 0.12),
    '600': `${r} ${g} ${b}`,
    '700': mixRgb(r, g, b, 0, 0, 0, 0.12),
    '800': mixRgb(r, g, b, 0, 0, 0, 0.24),
    '900': mixRgb(r, g, b, 0, 0, 0, 0.36),
  };
}

export function resolveThemeMode(preference?: ThemePreference | null): 'light' | 'dark' {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export type UserThemeSettings = {
  themePreference: ThemePreference;
  primaryColor: string;
};

export function getUserThemeSettings(
  themePreference?: string | null,
  primaryColor?: string | null
): UserThemeSettings {
  const pref =
    themePreference === 'light' || themePreference === 'dark' || themePreference === 'system'
      ? themePreference
      : 'system';
  return {
    themePreference: pref,
    primaryColor: normalizePrimaryColor(primaryColor),
  };
}

export function applyThemeToDocument(settings: UserThemeSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const mode = resolveThemeMode(settings.themePreference);
  root.setAttribute('data-theme', mode);

  const shades = generatePrimaryShades(settings.primaryColor);
  for (const [shade, value] of Object.entries(shades)) {
    root.style.setProperty(`--color-primary-${shade}`, value);
  }
}
