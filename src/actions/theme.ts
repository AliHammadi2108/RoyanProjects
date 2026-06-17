'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { themeSettingsSchema } from '@/lib/theme-schema';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/services/audit.service';

export async function getThemeSettingsAction() {
  const user = await requirePermission('profile.theme.view');
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { themePreference: true, primaryColor: true },
  });
  return {
    themePreference: record?.themePreference ?? 'system',
    primaryColor: record?.primaryColor ?? '#2563eb',
  };
}

export async function saveThemeSettingsAction(data: unknown) {
  const user = await requirePermission('profile.theme.edit');
  const parsed = themeSettingsSchema.parse(data);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      themePreference: parsed.themePreference,
      primaryColor: parsed.primaryColor,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: user.id,
    newValues: {
      field: 'theme',
      themePreference: parsed.themePreference,
      primaryColor: parsed.primaryColor,
    },
  });

  revalidatePath('/settings/appearance');
  return {
    success: true as const,
    themePreference: parsed.themePreference,
    primaryColor: parsed.primaryColor,
  };
}
