'use server';

import { revalidatePath } from 'next/cache';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { changeOwnPasswordSchema, resetUserPasswordSchema } from '@/lib/password-schema';
import { createAuditLog } from '@/services/audit.service';
import { changeOwnPassword, resetUserPassword } from '@/services/user.service';

export async function changePasswordAction(data: unknown) {
  const user = await requirePermission('profile.change_own_password');
  const parsed = changeOwnPasswordSchema.parse(data);

  await changeOwnPassword(user.id, parsed.currentPassword, parsed.newPassword);

  await createAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: user.id,
    newValues: { field: 'password', self: true },
  });

  revalidatePath('/settings/change-password');
  return { success: true as const };
}

export async function resetUserPasswordAction(data: unknown) {
  const actor = await requirePermission('access.users.reset_password');
  const parsed = resetUserPasswordSchema.parse(data);

  await resetUserPassword(parsed.userId, parsed.newPassword);

  await createAuditLog({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: parsed.userId,
    newValues: { field: 'password', resetByAdmin: true },
  });

  revalidatePath('/settings/users');
  return { success: true as const };
}

/** Admin editing user with password requires reset_password or edit permission. */
export async function assertCanResetUserPassword(actorId: string) {
  const canReset =
    (await hasPermission(actorId, 'access.users.reset_password')) ||
    (await hasPermission(actorId, 'access.users.edit'));
  if (!canReset) {
    throw new Error('ليس لديك صلاحية لإعادة تعيين كلمة مرور المستخدم');
  }
}
