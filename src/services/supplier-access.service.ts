import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export type SupplierAccessAction =
  | 'view'
  | 'use_in_purchase'
  | 'view_balance'
  | 'edit'
  | 'approve_transactions';

export async function isAdminUser(userId: string): Promise<boolean> {
  return hasPermission(userId, 'admin');
}

export async function getAllowedSupplierIds(
  userId: string,
  action: SupplierAccessAction = 'view'
): Promise<string[] | null> {
  if (await isAdminUser(userId)) return null;

  const perms = await prisma.userSupplierPermission.findMany({
    where: { userId },
  });

  if (perms.length === 0) return null;

  const fieldMap: Record<SupplierAccessAction, keyof (typeof perms)[0]> = {
    view: 'canView',
    use_in_purchase: 'canUseInPurchase',
    view_balance: 'canViewBalance',
    edit: 'canEdit',
    approve_transactions: 'canApproveTransactions',
  };

  const field = fieldMap[action];
  return perms.filter((p) => p[field]).map((p) => p.supplierId);
}

export async function assertSupplierAccess(
  userId: string,
  supplierId: string,
  action: SupplierAccessAction
) {
  const allowed = await getAllowedSupplierIds(userId, action);
  if (allowed === null) return;
  if (!allowed.includes(supplierId)) {
    throw new Error('ليس لديك صلاحية على هذا المورد');
  }
}

export function supplierWhereForUser(
  allowedIds: string[] | null,
  extra?: { isActive?: boolean }
) {
  const where: { isActive?: boolean; id?: { in: string[] } } = {
    ...(extra?.isActive !== undefined ? { isActive: extra.isActive } : { isActive: true }),
  };
  if (allowedIds !== null) {
    where.id = { in: allowedIds.length > 0 ? allowedIds : ['__none__'] };
  }
  return where;
}
