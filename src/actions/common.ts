'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, requireAuth, isAdmin, getUserPermissions } from '@/lib/permissions';
import { getAllowedSupplierIds, supplierWhereForUser } from '@/services/supplier-access.service';
import { approvalActionSchema } from '@/lib/validations';
import {
  processApprovalAction,
  getApprovalInbox,
  getApprovalForDocument,
  canUserApproveApproval,
} from '@/services/approval.service';
import {
  getUserNotifications,
  getDropdownNotifications,
  getUnreadCount,
  markAsRead,
  dismissNotification,
  markAsActioned,
  markAllAsRead,
} from '@/services/notification.service';
import { getTrackingStats, getTrackingList, getCycleWithAllStages } from '@/services/workflow.service';
import { getAuditLogs } from '@/services/audit.service';
import { prisma } from '@/lib/db';
import {
  getDocumentUsage,
  getDocumentUsageMap,
  type UsageDocumentType,
} from '@/services/used-document.service';

export async function getInbox() {
  const user = await requirePermission('approvals.view');
  const [inbox, admin] = await Promise.all([
    getApprovalInbox(user.id),
    isAdmin(user.id),
  ]);
  return { inbox, isAdmin: admin };
}

export async function checkCanApprove(approvalId: string) {
  const user = await requireAuth();
  return canUserApproveApproval(user.id, approvalId);
}

export async function processApproval(data: unknown) {
  const user = await requirePermission('approvals.action');
  const parsed = approvalActionSchema.parse(data);

  const result = await processApprovalAction({
    approvalId: parsed.approvalId,
    action: parsed.action,
    userId: user.id,
    notes: parsed.notes ?? undefined,
  });

  revalidatePath('/approvals/inbox');
  revalidatePath('/purchases');
  return result;
}

export async function getDocumentApproval(documentType: string, documentId: string) {
  await requirePermission('approvals.view');
  return getApprovalForDocument(documentType, documentId);
}

export async function fetchNotifications(filters?: { status?: string; type?: string }) {
  const user = await requireAuth();
  const [notifications, admin] = await Promise.all([
    getUserNotifications(user.id, filters),
    isAdmin(user.id),
  ]);
  return { notifications, isAdmin: admin };
}

export async function fetchDropdownNotifications() {
  const user = await requireAuth();
  const notifications = await getDropdownNotifications(user.id);
  return { notifications };
}

export async function fetchUnreadCount() {
  const user = await requireAuth();
  return getUnreadCount(user.id);
}

export async function readNotification(id: string) {
  const user = await requireAuth();
  await markAsRead(id, user.id);
  revalidatePath('/notifications');
}

export async function dismissHeaderNotification(id: string) {
  const user = await requireAuth();
  await dismissNotification(id, user.id);
  revalidatePath('/notifications');
}

export async function actionNotification(id: string) {
  const user = await requireAuth();
  await markAsActioned(id, user.id);
  revalidatePath('/notifications');
}

export async function readAllNotifications() {
  const user = await requireAuth();
  await markAllAsRead(user.id);
  revalidatePath('/notifications');
}

export async function fetchTrackingStats(filters?: { branchId?: string }) {
  await requirePermission('tracking.view');
  return getTrackingStats(filters);
}

export async function fetchTrackingList(filters?: {
  branchId?: string;
  status?: string;
  search?: string;
}) {
  await requirePermission('tracking.view');
  return getTrackingList(filters);
}

export async function fetchCycleDetails(cycleId: string) {
  await requirePermission('tracking.view');
  return getCycleWithAllStages(cycleId);
}

export async function fetchAuditLogs(entityType: string, entityId: string) {
  await requirePermission('audit_logs.view');
  return getAuditLogs(entityType, entityId);
}

export async function getApprovalMatrices() {
  await requirePermission('approvals.view');
  return prisma.approvalMatrix.findMany({
    include: { branch: true, department: true, role: true },
    orderBy: [{ documentType: 'asc' }, { level: 'asc' }],
  });
}

export async function saveApprovalMatrix(data: {
  id?: string;
  documentType: string;
  branchId?: string;
  departmentId?: string;
  minAmount?: number;
  maxAmount?: number;
  level: number;
  roleId?: string;
  userId?: string;
  requiredApprovalsCount?: number;
  approvalMode?: string;
  isActive?: boolean;
}) {
  await requirePermission('approvals.view');

  if (data.id) {
    return prisma.approvalMatrix.update({
      where: { id: data.id },
      data,
    });
  }

  return prisma.approvalMatrix.create({ data });
}

export async function getSessionPermissions() {
  const user = await requireAuth();
  return getUserPermissions(user.id);
}

export async function fetchDocumentUsage(documentType: UsageDocumentType, documentId: string) {
  await requireAuth();
  return getDocumentUsage(documentType, documentId);
}

export async function fetchDocumentUsageMap(
  documentType: UsageDocumentType,
  documentIds: string[]
) {
  await requireAuth();
  const map = await getDocumentUsageMap(documentType, documentIds);
  const result: Record<string, { isUsed: boolean; childType?: string; childId?: string; childNo?: string; childRoute?: string; label?: string }> = {};
  map.forEach((v, k) => {
    result[k] = v;
  });
  return result;
}

export async function getMasterData() {
  const user = await requireAuth();
  const allowedSupplierIds = await getAllowedSupplierIds(user.id, 'use_in_purchase');

  const [branches, departments, warehouses, suppliers, items, currencies, units] =
    await Promise.all([
      prisma.branch.findMany({ where: { isActive: true } }),
      prisma.department.findMany({ where: { isActive: true } }),
      prisma.warehouse.findMany({ where: { isActive: true } }),
      prisma.supplier.findMany({
        where: supplierWhereForUser(allowedSupplierIds, { isActive: true }),
        include: { defaultCurrency: true },
      }),
      prisma.item.findMany({
        where: { isActive: true },
        include: {
          legacyUnit: true,
          itemUnits: {
            where: { isActive: true },
            include: { unit: true },
          },
        },
      }),
      prisma.currency.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
      prisma.unit.findMany({ where: { isActive: true } }),
    ]);

  return { branches, departments, warehouses, suppliers, items, currencies, units };
}
