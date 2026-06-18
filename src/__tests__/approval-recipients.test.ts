import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    approval: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    approvalMatrix: {
      findMany: vi.fn(),
    },
    approvalLog: {
      create: vi.fn(),
    },
    approvalStep: {
      update: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    purchaseRequest: {
      update: vi.fn(),
    },
    quotation: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/services/audit.service', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/services/notification.service', () => ({
  notifyApprovers: vi.fn(),
  notifyDocumentOwner: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn().mockResolvedValue(false),
  isAdmin: vi.fn().mockResolvedValue(false),
}));

import { prisma } from '@/lib/db';
import { notifyApprovers } from '@/services/notification.service';
import { getApproverCandidates, submitForApproval } from '@/services/approval.service';
import { DOCUMENT_TYPES } from '@/lib/constants';

describe('approval recipient targeting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads approver candidates for level 1', async () => {
    vi.mocked(prisma.approvalMatrix.findMany).mockResolvedValue([
      {
        id: 'm1',
        documentType: DOCUMENT_TYPES.PURCHASE_REQUEST,
        branchId: 'b1',
        departmentId: null,
        level: 1,
        userId: 'u1',
        roleId: null,
        minAmount: null,
        maxAmount: null,
        isActive: true,
      } as never,
    ]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', nameAr: 'معتمد 1', username: 'approver1', userNo: '101' },
    ] as never);

    const candidates = await getApproverCandidates({
      documentType: DOCUMENT_TYPES.PURCHASE_REQUEST,
      branchId: 'b1',
      totalAmount: 500,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].nameAr).toBe('معتمد 1');
  });

  it('notifies only selected recipients on submit', async () => {
    vi.mocked(prisma.approval.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.approvalMatrix.findMany).mockResolvedValue([
      {
        id: 'm1',
        documentType: DOCUMENT_TYPES.QUOTATION,
        branchId: 'b1',
        departmentId: null,
        level: 1,
        userId: 'u1',
        roleId: null,
        minAmount: null,
        maxAmount: null,
        isActive: true,
      },
      {
        id: 'm2',
        documentType: DOCUMENT_TYPES.QUOTATION,
        branchId: 'b1',
        departmentId: null,
        level: 1,
        userId: 'u2',
        roleId: null,
        minAmount: null,
        maxAmount: null,
        isActive: true,
      },
    ] as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        approval: {
          create: vi.fn().mockResolvedValue({
            id: 'ap-new',
            steps: [{ id: 's1', level: 1 }],
          }),
        },
        approvalLog: { create: vi.fn() },
      };
      return fn(tx as never);
    });

    await submitForApproval({
      documentType: DOCUMENT_TYPES.QUOTATION,
      documentId: 'doc1',
      documentNo: 'Q-001',
      requestedBy: 'requester',
      totalAmount: 1000,
      branchId: 'b1',
      recipientUserIds: ['u2'],
    });

    expect(notifyApprovers).toHaveBeenCalledWith(
      'ap-new',
      DOCUMENT_TYPES.QUOTATION,
      'doc1',
      'Q-001',
      ['u2']
    );
  });
});
