import { requireScreenAccess } from '@/lib/permissions';
import { getThemeSettingsAction } from '@/actions/theme';
import { AppearanceSettingsClient } from '@/components/pages/AppearanceSettingsClient';
import { getUserThemeSettings, type ThemePreference } from '@/lib/theme';

export default async function AppearanceSettingsPage() {
  await requireScreenAccess('/settings/appearance');
  const settings = await getThemeSettingsAction();
  const normalized = getUserThemeSettings(
    settings.themePreference as ThemePreference,
    settings.primaryColor
  );

  return <AppearanceSettingsClient initial={normalized} />;
}
