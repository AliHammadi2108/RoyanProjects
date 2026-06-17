'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/services/audit.service';

const phoneSchema = z.object({
  phone: z.string().max(30).optional(),
});

export async function updateOwnPhoneAction(data: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('غير مصرح');
  }

  const parsed = phoneSchema.parse(data);
  const phone = parsed.phone?.trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone },
  });

  await createAuditLog({
    userId: session.user.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: session.user.id,
    newValues: { field: 'phone', self: true },
  });

  revalidatePath('/settings/change-password');
  revalidatePath('/settings/users');

  return { success: true as const, phone };
}
