import { z } from 'zod';
import { isValidHexColor } from '@/lib/theme';

export const themeSettingsSchema = z.object({
  themePreference: z.enum(['light', 'dark', 'system']),
  primaryColor: z
    .string()
    .refine((v) => isValidHexColor(v), { message: 'لون غير صالح' }),
});

export type ThemeSettingsInput = z.infer<typeof themeSettingsSchema>;
