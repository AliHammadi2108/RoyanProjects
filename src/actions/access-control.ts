'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import {
  requirePermission,
  getUserPermissionSummary,
  getUserPermissions,
} from '@/lib/permissions';
import {
  roleSchema,
  userPermissionSchema,
  userSupplierPermissionSchema,
  approvalRuleSchema,
  approvalRequestActionSchema,
} from '@/lib/validations';
import { processApprovalRequestAction } from '@/services/module-approval.service';
import { createAuditLog } from '@/services/audit.service';
import { formatActionError } from '@/lib/utils';

// ==================== Roles ====================

export async function getRoles() {
  await requirePermission('access.roles.view');
  return prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getAllPermissions() {
  await requirePermission('access.roles.view');
  return prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { screenCode: 'asc' }, { action: 'asc' }],
  });
}

export async function saveRole(data: unknown, id?: string) {
  const user = await requirePermission(id ? 'access.roles.edit' : 'access.roles.create');
  const parsed = roleSchema.parse(data);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const role = id
        ? await tx.role.update({
            where: { id },
            data: {
              name: parsed.name,
              code: parsed.code,
              nameAr: parsed.nameAr,
              description: parsed.description,
              isActive: parsed.isActive,
            },
          })
        : await tx.role.create({
            data: {
              name: parsed.name,
              code: parsed.code,
              nameAr: parsed.nameAr,
              description: parsed.description,
              isActive: parsed.isActive,
            },
          });

      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (parsed.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: parsed.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      return role;
    });

    await createAuditLog({
      userId: user.id,
      action: id ? 'UPDATE' : 'CREATE',
      entityType: 'ROLE',
      entityId: result.id,
    });
    revalidatePath('/settings/roles');
    return result;
  } catch (e) {
    throw new Error(formatActionError(e));
  }
}

export async function setRoleActive(id: string, isActive: boolean) {
  const user = await requirePermission('access.roles.edit');
  const result = await prisma.role.update({ where: { id }, data: { isActive } });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'ROLE', entityId: id });
  revalidatePath('/settings/roles');
  return result;
}

// ==================== User permissions ====================

export async function getUsersForPermissions() {
  await requirePermission('access.users.view');
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, username: true, nameAr: true, email: true },
    orderBy: { username: 'asc' },
  });
}

export async function getUserRolesAndPermissions(userId: string) {
  await requirePermission('access.users.view');
  const [roles, direct, summary] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    }),
    prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    }),
    getUserPermissionSummary(userId),
  ]);
  const effective = await getUserPermissions(userId);
  return { roles, direct, summary, effective };
}

export async function setUserRoles(userId: string, roleIds: string[]) {
  const user = await requirePermission('access.users.edit');
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }
  });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'USER_ROLES', entityId: userId });
  revalidatePath('/settings/user-permissions');
}

export async function saveUserPermission(data: unknown) {
  const user = await requirePermission('access.users.edit');
  const parsed = userPermissionSchema.parse(data);

  const result = await prisma.userPermission.upsert({
    where: {
      userId_permissionId: {
        userId: parsed.userId,
        permissionId: parsed.permissionId,
      },
    },
    create: parsed,
    update: { effect: parsed.effect },
  });

  await createAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'USER_PERMISSION',
    entityId: result.id,
  });
  revalidatePath('/settings/user-permissions');
  return result;
}

export async function removeUserPermission(userId: string, permissionId: string) {
  const user = await requirePermission('access.users.edit');
  await prisma.userPermission.deleteMany({ where: { userId, permissionId } });
  await createAuditLog({
    userId: user.id,
    action: 'DELETE',
    entityType: 'USER_PERMISSION',
    entityId: `${userId}:${permissionId}`,
  });
  revalidatePath('/settings/user-permissions');
}

// ==================== Supplier permissions ====================

export async function getUserSupplierPermissions(userId: string) {
  await requirePermission('access.supplier_permissions.view');
  return prisma.userSupplierPermission.findMany({
    where: { userId },
    include: { supplier: true },
  });
}

export async function saveUserSupplierPermission(data: unknown) {
  const user = await requirePermission('access.supplier_permissions.edit');
  const parsed = userSupplierPermissionSchema.parse(data);

  const result = await prisma.userSupplierPermission.upsert({
    where: {
      userId_supplierId: {
        userId: parsed.userId,
        supplierId: parsed.supplierId,
      },
    },
    create: parsed,
    update: {
      canView: parsed.canView,
      canUseInPurchase: parsed.canUseInPurchase,
      canViewBalance: parsed.canViewBalance,
      canEdit: parsed.canEdit,
      canApproveTransactions: parsed.canApproveTransactions,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'USER_SUPPLIER_PERMISSION',
    entityId: result.id,
  });
  revalidatePath('/settings/supplier-permissions');
  return result;
}

export async function removeUserSupplierPermission(userId: string, supplierId: string) {
  const user = await requirePermission('access.supplier_permissions.edit');
  await prisma.userSupplierPermission.deleteMany({ where: { userId, supplierId } });
  await createAuditLog({
    userId: user.id,
    action: 'DELETE',
    entityType: 'USER_SUPPLIER_PERMISSION',
    entityId: `${userId}:${supplierId}`,
  });
  revalidatePath('/settings/supplier-permissions');
}

// ==================== Approval rules & requests ====================

export async function getApprovalRules() {
  await requirePermission('access.approval_rules.view');
  return prisma.approvalRule.findMany({
    include: { currency: true },
    orderBy: [{ module: 'asc' }, { operationType: 'asc' }, { approvalLevel: 'asc' }],
  });
}

export async function saveApprovalRule(data: unknown, id?: string) {
  const user = await requirePermission(id ? 'access.approval_rules.edit' : 'access.approval_rules.create');
  const parsed = approvalRuleSchema.parse(data);

  const payload = {
    module: parsed.module,
    operationType: parsed.operationType,
    minAmount: parsed.minAmount,
    maxAmount: parsed.maxAmount,
    currencyId: parsed.currencyId || null,
    requiredPermission: parsed.requiredPermission,
    approvalLevel: parsed.approvalLevel,
    isActive: parsed.isActive,
    createdBy: user.id,
  };

  const result = id
    ? await prisma.approvalRule.update({ where: { id }, data: payload })
    : await prisma.approvalRule.create({ data: payload });

  await createAuditLog({
    userId: user.id,
    action: id ? 'UPDATE' : 'CREATE',
    entityType: 'APPROVAL_RULE',
    entityId: result.id,
  });
  revalidatePath('/settings/approval-rules');
  return result;
}

export async function setApprovalRuleActive(id: string, isActive: boolean) {
  const user = await requirePermission('access.approval_rules.edit');
  const result = await prisma.approvalRule.update({ where: { id }, data: { isActive } });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'APPROVAL_RULE', entityId: id });
  revalidatePath('/settings/approval-rules');
  return result;
}

export async function getPendingApprovalRequests() {
  await requirePermission('access.approval_requests.view');
  return prisma.approvalRequest.findMany({
    where: { status: 'pending' },
    include: {
      requester: { select: { nameAr: true, username: true } },
      currency: true,
      actions: {
        include: { user: { select: { nameAr: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function processStructuredApprovalRequest(data: unknown) {
  const user = await requirePermission('operations.approve');
  const parsed = approvalRequestActionSchema.parse(data);
  const result = await processApprovalRequestAction({
    requestId: parsed.requestId,
    userId: user.id,
    action: parsed.action,
    notes: parsed.notes,
  });
  await createAuditLog({
    userId: user.id,
    action: parsed.action.toUpperCase(),
    entityType: 'APPROVAL_REQUEST',
    entityId: parsed.requestId,
  });
  revalidatePath('/settings/approval-requests');
  return result;
}
