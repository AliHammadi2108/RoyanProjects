import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Purchase Workflow', () => {
  let branchId: string;
  let departmentId: string;
  let currencyId: string;
  let itemId: string;
  let supplierId: string;
  let requesterId: string;
  let approverId: string;
  let officerId: string;
  let warehouseUserId: string;
  let financeUserId: string;
  let purchaseRequestId: string;
  let purchaseCycleId: string;
  let quotationId: string;
  let comparisonId: string;
  let nominationId: string;
  let orderId: string;
  let inspectionId: string;
  let receivingId: string;

  beforeAll(async () => {
    const branch = await prisma.branch.findFirst();
    const dept = await prisma.department.findFirst();
    const currency = await prisma.currency.findFirst();
    const item = await prisma.item.findFirst();
    const supplier = await prisma.supplier.findFirst();
    const requester = await prisma.user.findUnique({ where: { username: 'requester' } });
    const approver = await prisma.user.findUnique({ where: { username: 'approver' } });
    const officer = await prisma.user.findUnique({ where: { username: 'purchasing_officer' } });
    const warehouse = await prisma.user.findUnique({ where: { username: 'warehouse_user' } });
    const finance = await prisma.user.findUnique({ where: { username: 'finance_user' } });

    branchId = branch!.id;
    departmentId = dept!.id;
    currencyId = currency!.id;
    itemId = item!.id;
    supplierId = supplier!.id;
    requesterId = requester!.id;
    approverId = approver!.id;
    officerId = officer!.id;
    warehouseUserId = warehouse!.id;
    financeUserId = finance!.id;
  });

  it('should create a purchase request', async () => {
    const cycle = await prisma.purchaseCycle.create({
      data: {
        cycleNo: `PC-TEST-${Date.now()}`,
        branchId,
        departmentId,
        currentStage: 'PURCHASE_REQUEST',
      },
    });
    purchaseCycleId = cycle.id;

    const request = await prisma.purchaseRequest.create({
      data: {
        documentNo: `PR-TEST-${Date.now()}`,
        purchaseCycleId: cycle.id,
        branchId,
        departmentId,
        currencyId,
        totalAmount: 5000,
        status: 'Draft',
        createdBy: requesterId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            quantity: 10,
            unitPrice: 500,
            total: 5000,
          }],
        },
      },
    });
    purchaseRequestId = request.id;
    expect(request.status).toBe('Draft');
  });

  it('should prevent quotation before approval', async () => {
    const request = await prisma.purchaseRequest.findUnique({ where: { id: purchaseRequestId } });
    expect(request?.status).not.toBe('Approved');
  });

  it('should approve purchase request', async () => {
    await prisma.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: { status: 'Approved', approvalStatus: 'Approved' },
    });
    const request = await prisma.purchaseRequest.findUnique({ where: { id: purchaseRequestId } });
    expect(request?.status).toBe('Approved');
  });

  it('should create quotation from approved request', async () => {
    const quotation = await prisma.quotation.create({
      data: {
        documentNo: `QT-TEST-${Date.now()}`,
        purchaseCycleId,
        purchaseRequestId,
        branchId,
        supplierId,
        currencyId,
        total: 4800,
        status: 'Draft',
        createdBy: officerId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            quantity: 10,
            unitPrice: 480,
            amount: 4800,
            total: 4800,
          }],
        },
      },
    });
    quotationId = quotation.id;
    expect(quotation.purchaseRequestId).toBe(purchaseRequestId);
  });

  it('should approve quotation', async () => {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'Approved', approvalStatus: 'Approved' },
    });
    const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
    expect(q?.status).toBe('Approved');
  });

  it('should create technical comparison', async () => {
    const comparison = await prisma.technicalComparison.create({
      data: {
        documentNo: `TC-TEST-${Date.now()}`,
        purchaseCycleId,
        branchId,
        currencyId,
        quotationIds: quotationId,
        totalAmount: 4800,
        status: 'Approved',
        approvalStatus: 'Approved',
        createdBy: officerId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            supplierId,
            supplierName: 'Test Supplier',
            quantity: 10,
            unitPrice: 480,
            netAmount: 4800,
            isSelected: true,
            quotationId,
          }],
        },
      },
    });
    comparisonId = comparison.id;
    expect(comparison.quotationIds).toContain(quotationId);
  });

  it('should create supplier nomination', async () => {
    const nomination = await prisma.supplierNomination.create({
      data: {
        documentNo: `SN-TEST-${Date.now()}`,
        purchaseCycleId,
        technicalComparisonId: comparisonId,
        branchId,
        supplierId,
        totalAmount: 4800,
        status: 'Approved',
        approvalStatus: 'Approved',
        createdBy: officerId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            quantity: 10,
            unitPrice: 480,
            netAmount: 4800,
            supplierId,
            isApproved: true,
          }],
        },
      },
    });
    nominationId = nomination.id;
    expect(nomination.status).toBe('Approved');
  });

  it('should create purchase order', async () => {
    const order = await prisma.purchaseOrder.create({
      data: {
        documentNo: `PO-TEST-${Date.now()}`,
        purchaseCycleId,
        supplierNominationId: nominationId,
        branchId,
        supplierId,
        currencyId,
        total: 4800,
        status: 'Approved',
        approvalStatus: 'Approved',
        createdBy: officerId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            quantity: 10,
            unitPrice: 480,
            price: 480,
            total: 4800,
          }],
        },
      },
    });
    orderId = order.id;
    expect(order.supplierNominationId).toBe(nominationId);
  });

  it('should create inspection', async () => {
    const inspection = await prisma.purchaseOrderInspection.create({
      data: {
        documentNo: `PI-TEST-${Date.now()}`,
        purchaseCycleId,
        purchaseOrderId: orderId,
        supplierId,
        inspectionResult: 'Accepted',
        status: 'Accepted',
        createdBy: warehouseUserId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            quantity: 10,
            matchedQty: 10,
            unmatchedQty: 0,
          }],
        },
      },
    });
    inspectionId = inspection.id;
    expect(inspection.inspectionResult).toBe('Accepted');
  });

  it('should create receiving', async () => {
    const receiving = await prisma.purchaseReceiving.create({
      data: {
        documentNo: `GR-TEST-${Date.now()}`,
        purchaseCycleId,
        purchaseOrderId: orderId,
        inspectionId,
        branchId,
        supplierId,
        receivingStatus: 'Fully Received',
        createdBy: warehouseUserId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            receivedQty: 10,
          }],
        },
      },
    });
    receivingId = receiving.id;
    expect(receiving.receivingStatus).toBe('Fully Received');
  });

  it('should create invoice', async () => {
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        documentNo: `INV-TEST-${Date.now()}`,
        purchaseCycleId,
        purchaseOrderId: orderId,
        receivingId,
        branchId,
        supplierId,
        netTotal: 4800,
        status: 'Draft',
        createdBy: financeUserId,
        items: {
          create: [{
            itemId,
            itemNameSnapshot: 'Test Item',
            quantity: 10,
            unitPrice: 480,
            price: 480,
            total: 4800,
          }],
        },
      },
    });
    expect(invoice.receivingId).toBe(receivingId);
  });

  it('should create approval notification for approvers', async () => {
    const approval = await prisma.approval.create({
      data: {
        documentType: 'PURCHASE_REQUEST',
        documentId: purchaseRequestId,
        status: 'Pending',
        requestedBy: requesterId,
        totalAmount: 5000,
        branchId,
      },
    });

    const notification = await prisma.notification.create({
      data: {
        userId: approverId,
        type: 'APPROVAL_REQUEST',
        title: 'طلب اعتماد',
        message: 'يوجد مستند بانتظار اعتمادك',
        documentType: 'PURCHASE_REQUEST',
        documentId: purchaseRequestId,
        approvalId: approval.id,
        priority: 'High',
      },
    });

    expect(notification.userId).toBe(approverId);
    expect(notification.type).toBe('APPROVAL_REQUEST');
  });

  it('should prevent unauthorized user from approving', async () => {
    const requesterRoles = await prisma.userRole.findMany({
      where: { userId: requesterId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const hasApprovalAction = requesterRoles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.name === 'approvals.action')
    );
    expect(hasApprovalAction).toBe(false);
  });

  it('should prevent creator from approving without APPROVE_OWN_DOCUMENT', async () => {
    const requesterPerms = await prisma.userRole.findMany({
      where: { userId: requesterId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const canApproveOwn = requesterPerms.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.name === 'APPROVE_OWN_DOCUMENT')
    );
    expect(canApproveOwn).toBe(false);
  });

  it('should allow admin to approve any pending document including own', async () => {
    const { canUserApproveApproval, getApprovalInbox } = await import('@/services/approval.service');
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    expect(admin).toBeTruthy();

    const pending = await prisma.approval.findFirst({ where: { status: 'Pending' } });
    if (pending) {
      const allowed = await canUserApproveApproval(admin!.id, pending.id);
      expect(allowed).toBe(true);
    }

    const inbox = await getApprovalInbox(admin!.id);
    const pendingApprovals = await prisma.approval.findMany({
      where: { status: 'Pending' },
      include: { steps: true },
    });
    const actionableCount = pendingApprovals.filter((a) =>
      a.steps.some((s) => s.level === a.currentLevel && s.status === 'Pending')
    ).length;
    expect(inbox.length).toBe(actionableCount);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
