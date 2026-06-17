'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { purchaseRequestSchema } from '@/lib/validations';
import { getNextDocumentNo } from '@/services/document-sequence.service';
import { createAuditLog } from '@/services/audit.service';
import { submitForApproval, DOCUMENT_TYPES } from '@/services/approval.service';
import { updateCycleStage } from '@/services/workflow.service';
import { DOCUMENT_STATUS, PURCHASE_STAGES } from '@/lib/constants';
import { calculateLineTotal, toOptionalId, formatActionError } from '@/lib/utils';
import { enrichPurchaseLineItems, resolveExchangeRate } from '@/lib/purchase-line-items';
import { assertSupplierAccess } from '@/services/supplier-access.service';

export async function getPurchaseRequests(filters?: { status?: string; branchId?: string }) {
  await requirePermission('purchase_requests.view');
  return prisma.purchaseRequest.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.branchId && { branchId: filters.branchId }),
    },
    include: {
      branch: true,
      department: true,
      currency: true,
      creator: { select: { nameAr: true } },
      items: { include: { item: true } },
      purchaseCycle: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPurchaseRequest(id: string) {
  await requirePermission('purchase_requests.view');
  return prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      branch: true,
      department: true,
      warehouse: true,
      supplier: true,
      currency: true,
      creator: true,
      items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      purchaseCycle: true,
      quotations: true,
    },
  });
}

export async function createPurchaseRequest(data: unknown) {
  const user = await requirePermission('purchase_requests.create');
  const parsed = purchaseRequestSchema.parse(data);

  const documentNo = await getNextDocumentNo('PURCHASE_REQUEST', parsed.branchId);
  const cycleNo = await getNextDocumentNo('PURCHASE_CYCLE', parsed.branchId);

  const totalAmount = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );

  const optionalIds = {
    departmentId: toOptionalId(parsed.departmentId),
    warehouseId: toOptionalId(parsed.warehouseId),
    supplierId: toOptionalId(parsed.supplierId),
    currencyId: toOptionalId(parsed.currencyId),
  };

  if (optionalIds.supplierId) {
    await assertSupplierAccess(user.id, optionalIds.supplierId, 'use_in_purchase');
  }

  const exchangeRate = parsed.exchangeRate ?? (await resolveExchangeRate(optionalIds.currencyId));
  const enrichedItems = await enrichPurchaseLineItems(parsed.items, 'purchase');

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    const cycle = await tx.purchaseCycle.create({
      data: {
        cycleNo,
        branchId: parsed.branchId,
        departmentId: optionalIds.departmentId,
        currentStage: PURCHASE_STAGES.PURCHASE_REQUEST,
        nextAction: 'في انتظار اعتماد طلب الشراء',
        totalAmount,
        currencyId: optionalIds.currencyId,
      },
    });

    const request = await tx.purchaseRequest.create({
      data: {
        documentNo,
        purchaseCycleId: cycle.id,
        branchId: parsed.branchId,
        departmentId: optionalIds.departmentId,
        requestDate: parsed.requestDate ? new Date(parsed.requestDate) : new Date(),
        requesterUnit: parsed.requesterUnit,
        purchaseType: parsed.purchaseType,
        operationNo: parsed.operationNo,
        warehouseId: optionalIds.warehouseId,
        supplierId: optionalIds.supplierId,
        currencyId: optionalIds.currencyId,
        exchangeRate,
        referenceNo: parsed.referenceNo,
        qualityLevel: parsed.qualityLevel,
        requiredDate: parsed.requiredDate ? new Date(parsed.requiredDate) : null,
        notes: parsed.notes,
        totalAmount,
        status: DOCUMENT_STATUS.DRAFT,
        createdBy: user.id,
        items: {
          create: enrichedItems.map((item, idx) => ({
            itemId: item.itemId,
            itemUnitId: item.itemUnitId,
            itemNameSnapshot: item.itemNameSnapshot,
            unitId: toOptionalId(item.unitId),
            factorToBase: item.factorToBase,
            baseQty: item.baseQty,
            packaging: item.packaging,
            specs: item.specs,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
            total: calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
            notes: item.notes,
            supplierPrice: item.supplierPrice,
            expiryDate: item.expiryDate ? new Date(item.expiryDate as string) : null,
            expectedDelivery: item.expectedDelivery ? new Date(item.expectedDelivery as string) : null,
            sortOrder: idx,
          })),
        },
      },
      include: { items: true },
    });

    return request;
  });
  } catch (err) {
    throw new Error(formatActionError(err));
  }

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'PURCHASE_REQUEST',
    entityId: result.id,
    newValues: { documentNo: result.documentNo },
  });

  revalidatePath('/purchases/requests');
  return result;
}

export async function updatePurchaseRequest(id: string, data: unknown) {
  const user = await requirePermission('purchase_requests.update');
  const parsed = purchaseRequestSchema.parse(data);

  const existing = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!existing) throw new Error('طلب الشراء غير موجود');
  if (!['Draft', 'Returned For Edit'].includes(existing.status)) {
    throw new Error('لا يمكن تعديل الطلب في حالته الحالية');
  }

  const totalAmount = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );

  const optionalIds = {
    departmentId: toOptionalId(parsed.departmentId),
    warehouseId: toOptionalId(parsed.warehouseId),
    supplierId: toOptionalId(parsed.supplierId),
    currencyId: toOptionalId(parsed.currencyId),
  };

  if (optionalIds.supplierId) {
    await assertSupplierAccess(user.id, optionalIds.supplierId, 'use_in_purchase');
  }

  const exchangeRate = parsed.exchangeRate ?? (await resolveExchangeRate(optionalIds.currencyId));
  const enrichedItems = await enrichPurchaseLineItems(parsed.items, 'purchase');

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });

    return tx.purchaseRequest.update({
      where: { id },
      data: {
        departmentId: optionalIds.departmentId,
        requesterUnit: parsed.requesterUnit,
        purchaseType: parsed.purchaseType,
        operationNo: parsed.operationNo,
        warehouseId: optionalIds.warehouseId,
        supplierId: optionalIds.supplierId,
        currencyId: optionalIds.currencyId,
        exchangeRate,
        referenceNo: parsed.referenceNo,
        qualityLevel: parsed.qualityLevel,
        requiredDate: parsed.requiredDate ? new Date(parsed.requiredDate) : null,
        notes: parsed.notes,
        totalAmount,
        updatedBy: user.id,
        items: {
          create: enrichedItems.map((item, idx) => ({
            itemId: item.itemId,
            itemUnitId: item.itemUnitId,
            itemNameSnapshot: item.itemNameSnapshot,
            unitId: toOptionalId(item.unitId),
            factorToBase: item.factorToBase,
            baseQty: item.baseQty,
            packaging: item.packaging,
            specs: item.specs,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
            total: calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
            notes: item.notes,
            sortOrder: idx,
          })),
        },
      },
      include: { items: true },
    });
  });
  } catch (err) {
    throw new Error(formatActionError(err));
  }

  await createAuditLog({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'PURCHASE_REQUEST',
    entityId: id,
  });

  revalidatePath(`/purchases/requests/${id}`);
  return result;
}

export async function submitPurchaseRequest(id: string) {
  const user = await requirePermission('purchase_requests.submit');
  const request = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!request) throw new Error('طلب الشراء غير موجود');
  if (!['Draft', 'Returned For Edit'].includes(request.status)) {
    throw new Error('لا يمكن إرسال الطلب للاعتماد في حالته الحالية');
  }

  await submitForApproval({
    documentType: DOCUMENT_TYPES.PURCHASE_REQUEST,
    documentId: id,
    documentNo: request.documentNo,
    requestedBy: user.id,
    totalAmount: request.totalAmount,
    branchId: request.branchId,
    departmentId: request.departmentId || undefined,
  });

  revalidatePath('/purchases/requests');
  revalidatePath(`/purchases/requests/${id}`);
  return { success: true };
}

export async function deletePurchaseRequest(id: string) {
  const user = await requirePermission('purchase_requests.delete');
  const existing = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!existing) throw new Error('طلب الشراء غير موجود');
  if (existing.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف الطلب إلا وهو في حالة مسودة');
  }

  await prisma.$transaction(async (tx) => {
    const requestCount = await tx.purchaseRequest.count({
      where: { purchaseCycleId: existing.purchaseCycleId },
    });
    await tx.purchaseRequest.delete({ where: { id } });
    if (requestCount === 1) {
      await tx.purchaseCycle.delete({ where: { id: existing.purchaseCycleId } });
    }
  });

  await createAuditLog({
    userId: user.id,
    action: 'DELETE',
    entityType: 'PURCHASE_REQUEST',
    entityId: id,
  });

  revalidatePath('/purchases/requests');
  return { success: true };
}

export async function getApprovedPurchaseRequests() {
  await requirePermission('quotations.create');
  return prisma.purchaseRequest.findMany({
    where: { status: DOCUMENT_STATUS.APPROVED },
    include: { branch: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
}
