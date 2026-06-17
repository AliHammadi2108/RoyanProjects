import { requireScreenAccess } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { ChangePasswordClient } from '@/components/pages/ChangePasswordClient';

export default async function ChangePasswordPage() {
  const user = await requireScreenAccess('/settings/change-password');
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true },
  });

  return <ChangePasswordClient initialPhone={profile?.phone ?? ''} />;
}
