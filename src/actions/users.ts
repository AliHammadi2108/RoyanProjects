'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import { assertCanResetUserPassword } from '@/actions/password';
import { createAuditLog } from '@/services/audit.service';
import { deactivateUser, getUserById, getUsers, saveUser } from '@/services/user.service';
import { prisma } from '@/lib/db';

const userFormSchema = z
  .object({
    userNo: z
      .string()
      .min(1, 'رقم المستخدم مطلوب')
      .regex(/^\d+$/, 'رقم المستخدم يجب أن يكون أرقاماً فقط'),
    nameAr: z.string().min(2, 'الاسم الكامل مطلوب'),
    phone: z.string().optional(),
    email: z.string().email('البريد الإلكتروني غير صالح'),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
    branchId: z.string().optional(),
    departmentId: z.string().optional(),
    roleIds: z.array(z.string()).default([]),
    permissionIds: z.array(z.string()).default([]),
    supplierIds: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.password && !data.confirmPassword) return;
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'كلمة المرور وتأكيدها غير متطابقين',
        path: ['confirmPassword'],
      });
    }
    if (data.password && data.password.length < 6) {
      ctx.addIssue({
        code: 'custom',
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        path: ['password'],
      });
    }
  });

export async function fetchUsers(search?: string) {
  await requirePermission('access.users.view');
  return getUsers({ search });
}

export async function fetchUser(id: string) {
  await requirePermission('access.users.view');
  return getUserById(id);
}

export async function saveUserAction(data: unknown, id?: string) {
  const actor = await requirePermission('access.users.edit');
  const isNew = !id;

  if (isNew) {
    const parsed = userFormSchema
      .and(
        z.object({
          password: z.string().min(6, 'كلمة المرور مطلوبة للمستخدم الجديد'),
          confirmPassword: z.string().min(6, 'تأكيد كلمة المرور مطلوب'),
        })
      )
      .parse(data);
    const result = await saveUser(parsed, undefined);
    await createAuditLog({
      userId: actor.id,
      action: 'CREATE',
      entityType: 'USER',
      entityId: result.id,
      newValues: { userNo: result.userNo },
    });
    revalidatePath('/settings/users');
    return result;
  }

  const parsed = userFormSchema.parse(data);
  if (parsed.password && parsed.password.length > 0) {
    await assertCanResetUserPassword(actor.id);
  }
  const result = await saveUser(parsed, id);
  await createAuditLog({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: result.id,
  });
  revalidatePath('/settings/users');
  return result;
}

export async function removeUserAction(id: string) {
  const actor = await requirePermission('access.users.edit');
  const result = await deactivateUser(id);
  await createAuditLog({
    userId: actor.id,
    action: 'DEACTIVATE',
    entityType: 'USER',
    entityId: id,
  });
  revalidatePath('/settings/users');
  return result;
}

export async function getUsersFormOptions() {
  await requirePermission('access.users.view');
  const [roles, permissions, suppliers, branches, departments] = await Promise.all([
    prisma.role.findMany({ where: { isActive: true }, orderBy: { nameAr: 'asc' } }),
    prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { name: 'asc' }] }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { nameAr: 'asc' } }),
    prisma.branch.findMany({ where: { isActive: true } }),
    prisma.department.findMany({ where: { isActive: true } }),
  ]);
  return { roles, permissions, suppliers, branches, departments };
}
