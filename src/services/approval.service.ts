import { prisma } from '@/lib/db';
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
  APPROVAL_STATUS,
  NOTIFICATION_TYPES,
} from '@/lib/constants';
import { createAuditLog } from './audit.service';
import { createNotification, notifyApprovers, notifyDocumentOwner } from './notification.service';
import { hasPermission, isAdmin, getAdminUserIds } from '@/lib/permissions';

type ApprovalAction = 'approve' | 'reject' | 'return' | 'cancel';

interface SubmitForApprovalInput {
  documentType: string;
  documentId: string;
  documentNo: string;
  requestedBy: string;
  totalAmount: number;
  branchId?: string;
  departmentId?: string;
}

interface ApprovalActionInput {
  approvalId: string;
  action: ApprovalAction;
  userId: string;
  notes?: string;
}

async function updateDocumentStatus(
  documentType: string,
  documentId: string,
  status: string,
  approvalStatus: string
) {
  const data = { status, approvalStatus };

  switch (documentType) {
    case DOCUMENT_TYPES.PURCHASE_REQUEST:
      await prisma.purchaseRequest.update({ where: { id: documentId }, data });
      break;
    case DOCUMENT_TYPES.QUOTATION:
      await prisma.quotation.update({ where: { id: documentId }, data });
      break;
    case DOCUMENT_TYPES.TECHNICAL_COMPARISON:
      await prisma.technicalComparison.update({ where: { id: documentId }, data });
      break;
    case DOCUMENT_TYPES.SUPPLIER_NOMINATION:
      await prisma.supplierNomination.update({ where: { id: documentId }, data });
      break;
    case DOCUMENT_TYPES.PURCHASE_ORDER:
      await prisma.purchaseOrder.update({ where: { id: documentId }, data });
      break;
    case DOCUMENT_TYPES.SUPPLIER_PAYMENT:
      await prisma.supplierPaymentVoucher.update({ where: { id: documentId }, data });
      break;
  }
}
async function getApproversForLevel(
  documentType: string,
  level: number,
  branchId?: string | null,
  departmentId?: string | null,
  totalAmount?: number
): Promise<string[]> {
  const matrices = await prisma.approvalMatrix.findMany({
    where: {
      documentType,
      level,
      isActive: true,
      OR: [{ branchId: branchId || undefined }, { branchId: null }],
    },
    orderBy: { level: 'asc' },
  });

  const filtered = matrices.filter((m) => {
    if (m.departmentId && departmentId && m.departmentId !== departmentId) return false;
    if (m.minAmount != null && totalAmount != null && totalAmount < m.minAmount) return false;
    if (m.maxAmount != null && totalAmount != null && totalAmount > m.maxAmount) return false;
    return true;
  });

  const userIds = new Set<string>();

  for (const matrix of filtered) {
    if (matrix.userId) {
      userIds.add(matrix.userId);
    }
    if (matrix.roleId) {
      const roleUsers = await prisma.userRole.findMany({
        where: { roleId: matrix.roleId },
        select: { userId: true },
      });
      roleUsers.forEach((ru) => userIds.add(ru.userId));
    }
  }

  return Array.from(userIds);
}

export async function submitForApproval(input: SubmitForApprovalInput) {
  const existing = await prisma.approval.findFirst({
    where: {
      documentType: input.documentType,
      documentId: input.documentId,
      status: 'Pending',
    },
  });

  if (existing) {
    throw new Error('يوجد طلب اعتماد معلق بالفعل لهذا المستند');
  }

  const matrices = await prisma.approvalMatrix.findMany({
    where: {
      documentType: input.documentType,
      isActive: true,
      OR: [{ branchId: input.branchId }, { branchId: null }],
    },
    orderBy: { level: 'asc' },
  });

  if (matrices.length === 0) {
    throw new Error('لم يتم إعداد مصفوفة الاعتماد لهذا النوع من المستندات');
  }

  const maxLevel = Math.max(...matrices.map((m) => m.level));
  const firstLevelApprovers = await getApproversForLevel(
    input.documentType,
    1,
    input.branchId,
    input.departmentId,
    input.totalAmount
  );

  if (firstLevelApprovers.length === 0) {
    throw new Error('لم يتم العثور على معتمدين للمستوى الأول');
  }

  const approval = await prisma.$transaction(async (tx) => {
    const newApproval = await tx.approval.create({
      data: {
        documentType: input.documentType,
        documentId: input.documentId,
        currentLevel: 1,
        status: 'Pending',
        requestedBy: input.requestedBy,
        totalAmount: input.totalAmount,
        branchId: input.branchId,
        departmentId: input.departmentId,
        steps: {
          create: await Promise.all(
            Array.from({ length: maxLevel }, async (_, i) => {
              const level = i + 1;
              const levelMatrices = matrices.filter((m) => m.level === level);
              const matrix = levelMatrices[0];
              const approvers = await getApproversForLevel(
                input.documentType,
                level,
                input.branchId,
                input.departmentId,
                input.totalAmount
              );

              return {
                level,
                approverUserId: matrix?.userId || approvers[0] || null,
                approverRoleId: matrix?.roleId || null,
                status: level === 1 ? 'Pending' : 'Skipped',
              };
            })
          ),
        },
      },
      include: { steps: true },
    });

    await tx.approvalLog.create({
      data: {
        approvalId: newApproval.id,
        documentType: input.documentType,
        documentId: input.documentId,
        action: 'SUBMIT',
        oldStatus: DOCUMENT_STATUS.DRAFT,
        newStatus: DOCUMENT_STATUS.PENDING_APPROVAL,
        performedBy: input.requestedBy,
      },
    });

    return newApproval;
  });

  await updateDocumentStatus(
    input.documentType,
    input.documentId,
    DOCUMENT_STATUS.PENDING_APPROVAL,
    APPROVAL_STATUS.PENDING
  );

  await createAuditLog({
    userId: input.requestedBy,
    action: 'SUBMIT_FOR_APPROVAL',
    entityType: input.documentType,
    entityId: input.documentId,
    newValues: { approvalId: approval.id },
  });

  const adminIds = await getAdminUserIds();
  const notifyTargets = Array.from(new Set([...firstLevelApprovers, ...adminIds]));

  await notifyApprovers(
    approval.id,
    input.documentType,
    input.documentId,
    input.documentNo,
    notifyTargets.filter((id) => id !== input.requestedBy)
  );

  const requesterExcluded = notifyTargets.filter((id) => id !== input.requestedBy);
  if (requesterExcluded.length === 0 && notifyTargets.includes(input.requestedBy)) {
    const canApproveOwn =
      (await isAdmin(input.requestedBy)) ||
      (await hasPermission(input.requestedBy, 'APPROVE_OWN_DOCUMENT'));
    if (canApproveOwn) {
      await notifyApprovers(
        approval.id,
        input.documentType,
        input.documentId,
        input.documentNo,
        [input.requestedBy]
      );
    }
  }

  return approval;
}

export async function processApprovalAction(input: ApprovalActionInput) {
  const approval = await prisma.approval.findUnique({
    where: { id: input.approvalId },
    include: { steps: { orderBy: { level: 'asc' } } },
  });

  if (!approval) throw new Error('طلب الاعتماد غير موجود');
  if (approval.status !== 'Pending') throw new Error('طلب الاعتماد ليس في حالة انتظار');

  const currentStep = approval.steps.find(
    (s) => s.level === approval.currentLevel && s.status === 'Pending'
  );

  if (!currentStep) throw new Error('لا يوجد خطوة اعتماد معلقة');

  const admin = await isAdmin(input.userId);

  if (!admin) {
    const isApprover =
      currentStep.approverUserId === input.userId ||
      (currentStep.approverRoleId &&
        (await prisma.userRole.findFirst({
          where: { userId: input.userId, roleId: currentStep.approverRoleId },
        })));

    if (!isApprover) {
      const matrixApprovers = await getApproversForLevel(
        approval.documentType,
        approval.currentLevel,
        approval.branchId,
        approval.departmentId,
        approval.totalAmount
      );
      if (!matrixApprovers.includes(input.userId)) {
        throw new Error('ليس لديك صلاحية اعتماد هذا المستند');
      }
    }

    if (approval.requestedBy === input.userId) {
      const canApproveOwn = await hasPermission(input.userId, 'APPROVE_OWN_DOCUMENT');
      if (!canApproveOwn) {
        throw new Error('لا يمكنك اعتماد مستند أنشأته بنفسك');
      }
    }
  }

  if ((input.action === 'reject' || input.action === 'return') && !input.notes?.trim()) {
    throw new Error('يجب إدخال سبب الرفض أو ملاحظات الإرجاع');
  }

  if (input.action === 'reject') {
    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: { status: 'Rejected', actionBy: input.userId, actionAt: new Date(), notes: input.notes },
      });
      await tx.approval.update({
        where: { id: approval.id },
        data: { status: 'Rejected', completedAt: new Date() },
      });
      await tx.approvalLog.create({
        data: {
          approvalId: approval.id,
          documentType: approval.documentType,
          documentId: approval.documentId,
          action: 'REJECT',
          oldStatus: 'Pending',
          newStatus: 'Rejected',
          performedBy: input.userId,
          notes: input.notes,
        },
      });
    });

    await updateDocumentStatus(
      approval.documentType,
      approval.documentId,
      DOCUMENT_STATUS.REJECTED,
      APPROVAL_STATUS.REJECTED
    );

    await notifyDocumentOwner(
      approval.requestedBy,
      NOTIFICATION_TYPES.APPROVAL_REJECTED,
      'تم رفض المستند',
      `تم رفض المستند. السبب: ${input.notes}`,
      approval.documentType,
      approval.documentId
    );

    await createAuditLog({
      userId: input.userId,
      action: 'REJECT',
      entityType: approval.documentType,
      entityId: approval.documentId,
      newValues: { notes: input.notes },
    });

    return { status: 'Rejected' };
  }

  if (input.action === 'return') {
    await prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: { status: 'Returned', actionBy: input.userId, actionAt: new Date(), notes: input.notes },
      });
      await tx.approval.update({
        where: { id: approval.id },
        data: { status: 'Returned', completedAt: new Date() },
      });
      await tx.approvalLog.create({
        data: {
          approvalId: approval.id,
          documentType: approval.documentType,
          documentId: approval.documentId,
          action: 'RETURN',
          oldStatus: 'Pending',
          newStatus: 'Returned',
          performedBy: input.userId,
          notes: input.notes,
        },
      });
    });

    await updateDocumentStatus(
      approval.documentType,
      approval.documentId,
      DOCUMENT_STATUS.RETURNED_FOR_EDIT,
      APPROVAL_STATUS.RETURNED
    );

    await notifyDocumentOwner(
      approval.requestedBy,
      NOTIFICATION_TYPES.APPROVAL_RETURNED,
      'تم إرجاع المستند للتعديل',
      `تم إرجاع المستند للتعديل. الملاحظات: ${input.notes}`,
      approval.documentType,
      approval.documentId
    );

    return { status: 'Returned' };
  }

  if (input.action === 'cancel') {
    await prisma.approval.update({
      where: { id: approval.id },
      data: { status: 'Cancelled', completedAt: new Date() },
    });
    await updateDocumentStatus(
      approval.documentType,
      approval.documentId,
      DOCUMENT_STATUS.DRAFT,
      APPROVAL_STATUS.NONE
    );
    return { status: 'Cancelled' };
  }

  // Approve action
  const matrices = await prisma.approvalMatrix.findMany({
    where: { documentType: approval.documentType, isActive: true },
  });
  const maxLevel = Math.max(...matrices.map((m) => m.level), approval.currentLevel);
  await prisma.approvalStep.update({
    where: { id: currentStep.id },
    data: { status: 'Approved', actionBy: input.userId, actionAt: new Date(), notes: input.notes },
  });

  const isFinalLevel = approval.currentLevel >= maxLevel;

  if (!isFinalLevel) {
    const nextLevel = approval.currentLevel + 1;
    const nextApprovers = await getApproversForLevel(
      approval.documentType,
      nextLevel,
      approval.branchId,
      approval.departmentId,
      approval.totalAmount
    );

    await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: approval.id },
        data: { currentLevel: nextLevel },
      });

      const nextStep = approval.steps.find((s) => s.level === nextLevel);
      if (nextStep) {
        await tx.approvalStep.update({
          where: { id: nextStep.id },
          data: { status: 'Pending' },
        });
      }

      await tx.approvalLog.create({
        data: {
          approvalId: approval.id,
          documentType: approval.documentType,
          documentId: approval.documentId,
          action: 'APPROVE_LEVEL',
          oldStatus: `Level ${approval.currentLevel}`,
          newStatus: `Level ${nextLevel}`,
          performedBy: input.userId,
          notes: input.notes,
        },
      });
    });

    const doc = await getDocumentNo(approval.documentType, approval.documentId);
    await notifyApprovers(
      approval.id,
      approval.documentType,
      approval.documentId,
      doc,
      nextApprovers
    );

    return { status: 'Pending', level: nextLevel };
  }

  // Final approval
  await prisma.$transaction(async (tx) => {
    await tx.approval.update({
      where: { id: approval.id },
      data: { status: 'Approved', completedAt: new Date() },
    });
    await tx.approvalLog.create({
      data: {
        approvalId: approval.id,
        documentType: approval.documentType,
        documentId: approval.documentId,
        action: 'APPROVE_FINAL',
        oldStatus: 'Pending',
        newStatus: 'Approved',
        performedBy: input.userId,
        notes: input.notes,
      },
    });
  });

  await updateDocumentStatus(
    approval.documentType,
    approval.documentId,
    DOCUMENT_STATUS.APPROVED,
    APPROVAL_STATUS.APPROVED
  );

  await notifyDocumentOwner(
    approval.requestedBy,
    NOTIFICATION_TYPES.APPROVAL_APPROVED,
    'تم اعتماد المستند',
    'تم اعتماد المستند بنجاح',
    approval.documentType,
    approval.documentId
  );

  await createAuditLog({
    userId: input.userId,
    action: 'APPROVE',
    entityType: approval.documentType,
    entityId: approval.documentId,
  });

  return { status: 'Approved' };
}

async function getDocumentNo(documentType: string, documentId: string): Promise<string> {
  switch (documentType) {
    case DOCUMENT_TYPES.PURCHASE_REQUEST: {
      const doc = await prisma.purchaseRequest.findUnique({ where: { id: documentId }, select: { documentNo: true } });
      return doc?.documentNo || documentId;
    }
    case DOCUMENT_TYPES.QUOTATION: {
      const doc = await prisma.quotation.findUnique({ where: { id: documentId }, select: { documentNo: true } });
      return doc?.documentNo || documentId;
    }
    case DOCUMENT_TYPES.TECHNICAL_COMPARISON: {
      const doc = await prisma.technicalComparison.findUnique({ where: { id: documentId }, select: { documentNo: true } });
      return doc?.documentNo || documentId;
    }
    case DOCUMENT_TYPES.SUPPLIER_NOMINATION: {
      const doc = await prisma.supplierNomination.findUnique({ where: { id: documentId }, select: { documentNo: true } });
      return doc?.documentNo || documentId;
    }
    case DOCUMENT_TYPES.PURCHASE_ORDER: {
      const doc = await prisma.purchaseOrder.findUnique({ where: { id: documentId }, select: { documentNo: true } });
      return doc?.documentNo || documentId;
    }
    default:
      return documentId;
  }
}

export async function getApprovalForDocument(documentType: string, documentId: string) {
  return prisma.approval.findFirst({
    where: { documentType, documentId },
    include: {
      steps: { orderBy: { level: 'asc' }, include: { approverUser: true, actionUser: true } },
      logs: { orderBy: { createdAt: 'desc' }, include: { performer: true } },
      requester: true,
    },
    orderBy: { requestedAt: 'desc' },
  });
}

export async function canUserApproveApproval(userId: string, approvalId: string): Promise<boolean> {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { steps: { orderBy: { level: 'asc' } } },
  });
  if (!approval || approval.status !== 'Pending') return false;
  if (await isAdmin(userId)) return true;

  const currentStep = approval.steps.find(
    (s) => s.level === approval.currentLevel && s.status === 'Pending'
  );
  if (!currentStep) return false;

  const isApprover =
    currentStep.approverUserId === userId ||
    (currentStep.approverRoleId &&
      !!(await prisma.userRole.findFirst({
        where: { userId, roleId: currentStep.approverRoleId },
      })));

  let allowed = isApprover;
  if (!allowed) {
    const matrixApprovers = await getApproversForLevel(
      approval.documentType,
      approval.currentLevel,
      approval.branchId,
      approval.departmentId,
      approval.totalAmount
    );
    allowed = matrixApprovers.includes(userId);
  }

  if (!allowed) return false;
  if (approval.requestedBy === userId) {
    return hasPermission(userId, 'APPROVE_OWN_DOCUMENT');
  }
  return true;
}

export async function getApprovalInbox(userId: string) {
  if (await isAdmin(userId)) {
    const pendingApprovals = await prisma.approval.findMany({
      where: { status: 'Pending' },
      include: { requester: true, steps: true },
      orderBy: { requestedAt: 'asc' },
    });

    const results = [];
    for (const approval of pendingApprovals) {
      const currentStep = approval.steps.find(
        (s) => s.level === approval.currentLevel && s.status === 'Pending'
      );
      if (!currentStep) continue;

      const docNo = await getDocumentNo(approval.documentType, approval.documentId);
      results.push({
        id: currentStep.id,
        level: currentStep.level,
        documentNo: docNo,
        waitingDays: Math.floor(
          (Date.now() - approval.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
        approval,
      });
    }
    return results;
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });
  const roleIds = userRoles.map((r) => r.roleId);

  const pendingSteps = await prisma.approvalStep.findMany({
    where: {
      status: 'Pending',
      OR: [{ approverUserId: userId }, { approverRoleId: { in: roleIds } }],
      approval: { status: 'Pending' },
    },
    include: {
      approval: {
        include: { requester: true },
      },
    },
    orderBy: { approval: { requestedAt: 'asc' } },
  });

  const results = [];
  for (const step of pendingSteps) {
    if (step.approval.currentLevel !== step.level) continue;

    const docNo = await getDocumentNo(step.approval.documentType, step.approval.documentId);
    results.push({
      ...step,
      documentNo: docNo,
      waitingDays: Math.floor(
        (Date.now() - step.approval.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    });
  }

  return results;
}

export { DOCUMENT_TYPES };
