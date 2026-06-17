import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function findMatchingApprovalRule(params: {
  module: string;
  operationType: string;
  amount: number;
  currencyId?: string;
}) {
  const rules = await prisma.approvalRule.findMany({
    where: {
      module: params.module,
      operationType: params.operationType,
      isActive: true,
    },
    orderBy: { approvalLevel: 'asc' },
  });

  return rules.find((rule) => {
    if (rule.currencyId && params.currencyId && rule.currencyId !== params.currencyId) {
      return false;
    }
    if (rule.minAmount != null && params.amount < rule.minAmount) return false;
    if (rule.maxAmount != null && params.amount > rule.maxAmount) return false;
    return true;
  });
}

export async function createApprovalRequestIfNeeded(params: {
  module: string;
  operationType: string;
  referenceId: string;
  requestedBy: string;
  amount: number;
  currencyId?: string;
  notes?: string;
}) {
  const rule = await findMatchingApprovalRule(params);
  if (!rule) return null;

  if (rule.requiredPermission) {
    const ok = await hasPermission(params.requestedBy, rule.requiredPermission);
    if (ok) return null;
  }

  const existing = await prisma.approvalRequest.findFirst({
    where: {
      module: params.module,
      operationType: params.operationType,
      referenceId: params.referenceId,
      status: 'pending',
    },
  });
  if (existing) return existing;

  return prisma.approvalRequest.create({
    data: {
      module: params.module,
      operationType: params.operationType,
      referenceId: params.referenceId,
      requestedBy: params.requestedBy,
      status: 'pending',
      level: rule.approvalLevel,
      amount: params.amount,
      currencyId: params.currencyId,
      notes: params.notes,
    },
  });
}

export async function processApprovalRequestAction(params: {
  requestId: string;
  userId: string;
  action: 'approve' | 'reject' | 'return_for_edit' | 'cancel';
  notes?: string;
}) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: params.requestId },
  });
  if (!request) throw new Error('طلب الاعتماد غير موجود');
  if (request.status !== 'pending') throw new Error('طلب الاعتماد ليس قيد الانتظار');

  const statusMap: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    return_for_edit: 'returned',
    cancel: 'cancelled',
  };

  return prisma.$transaction(async (tx) => {
    await tx.approvalRequestAction.create({
      data: {
        requestId: params.requestId,
        userId: params.userId,
        action: params.action,
        level: request.level,
        notes: params.notes,
      },
    });

    return tx.approvalRequest.update({
      where: { id: params.requestId },
      data: { status: statusMap[params.action] ?? request.status },
    });
  });
}

export async function assertOperationApproved(
  module: string,
  operationType: string,
  referenceId: string
) {
  const pending = await prisma.approvalRequest.findFirst({
    where: {
      module,
      operationType,
      referenceId,
      status: 'pending',
    },
  });
  if (pending) {
    throw new Error('العملية بانتظار الاعتماد ولا يمكن إكمالها');
  }
}
