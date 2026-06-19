import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './db';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      },
      branch: true,
      department: true,
    },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.some((ur) => ur.role.name === 'admin');
}

export async function getAdminUserIds(): Promise<string[]> {
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) return [];
  const rows = await prisma.userRole.findMany({
    where: { roleId: adminRole.id, user: { isActive: true } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function getEffectivePermissions(
  userId: string
): Promise<Map<string, 'allow' | 'deny'>> {
  const effective = new Map<string, 'allow' | 'deny'>();

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      effective.set(rp.permission.name, 'allow');
    }
  }

  const direct = await prisma.userPermission.findMany({
    where: { userId },
    include: { permission: true },
  });

  for (const up of direct) {
    effective.set(up.permission.name, up.effect === 'deny' ? 'deny' : 'allow');
  }

  return effective;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  if (await isAdmin(userId)) return ['admin'];

  const effective = await getEffectivePermissions(userId);
  const allowed: string[] = [];
  effective.forEach((effect, name) => {
    if (effect === 'allow') allowed.push(name);
  });
  return allowed;
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  if (await isAdmin(userId)) return true;

  const effective = await getEffectivePermissions(userId);
  const direct = effective.get(permission);
  if (direct === 'deny') return false;
  if (direct === 'allow') return true;
  return false;
}

export async function requirePermission(permission: string) {
  const user = await requireAuth();
  const allowed = await hasPermission(user.id, permission);
  if (!allowed) {
    redirect('/unauthorized');
  }
  return user;
}

/** Redirect when the current user cannot view a screen path. */
export async function requireScreenAccess(pathname: string) {
  const user = await requireAuth();
  const { canAccessPath } = await import('@/lib/screen-access');
  const allowed = await canAccessPath(user.id, pathname);
  if (!allowed) {
    redirect('/unauthorized');
  }
  return user;
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.some((ur) => ur.role.name === roleName || ur.role.name === 'admin');
}

export async function getUserPermissionSummary(userId: string) {
  const effective = await getEffectivePermissions(userId);
  const allPerms = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { name: 'asc' }],
  });
  const admin = await isAdmin(userId);

  return allPerms.map((p) => ({
    permission: p,
    effect: effective.get(p.name) ?? null,
    granted: effective.get(p.name) === 'allow' || admin,
    denied: effective.get(p.name) === 'deny',
  }));
}
