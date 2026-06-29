'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { isOracleMode } from '@/database/provider';
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
import { assertSupplierCurrencyAllowed } from '@/services/supplier-currency.service';
import { assertDocumentMutable } from '@/services/document-guard.service';
import { getDocumentUsageMap } from '@/services/used-document.service';

function lineItemsForEnrich<T extends {
  itemUnitId?: string | null;
  unitId?: string | null;
  factorToBase?: number | null;
  baseQty?: number | null;
}>(items: T[]) {
  return items.map((item) => ({
    ...item,
    itemUnitId: item.itemUnitId ?? undefined,
    unitId: item.unitId ?? undefined,
    factorToBase: item.factorToBase ?? undefined,
    baseQty: item.baseQty ?? undefined,
  }));
}


export async function getPurchaseRequests(filters?: {
  status?: string;
  branchId?: string;
  search?: string;
  usedFilter?: '' | 'used' | 'unused';
}) {
  await requirePermission('purchase_requests.view');

  if (isOracleMode()) {
    const { listPurchaseRequests } = await import('@/database/repositories/purchase-request.repository');
    const { toPurchaseRequestListRow } = await import('@/database/adapters/purchase-request.adapter');
    const result = await listPurchaseRequests({
      status: filters?.status,
      search: filters?.search,
      pageSize: 200,
    });
    let rows = result.rows.map(toPurchaseRequestListRow);
    if (filters?.usedFilter) {
      const usageMap = await getDocumentUsageMap(
        'PURCHASE_REQUEST',
        rows.map((r) => r.id)
      );
      rows = rows.filter((r) => {
        const used = usageMap.get(r.id)?.isUsed;
        return filters.usedFilter === 'used' ? used : !used;
      });
    }
    return rows;
  }

  const rows = await prisma.purchaseRequest.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.search && {
        OR: [
          { documentNo: { contains: filters.search } },
          { operationNo: { contains: filters.search } },
        ],
      }),
    },
    include: {
      branch: true,
      department: true,
      currency: true,
      creator: { select: { nameAr: true } },
      items: { include: { item: true } },
      purchaseCycle: true,
      _count: { select: { quotations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!filters?.usedFilter) return rows;

  const usageMap = await getDocumentUsageMap(
    'PURCHASE_REQUEST',
    rows.map((r) => r.id)
  );
  return rows.filter((r) => {
    const used = usageMap.get(r.id)?.isUsed || r._count.quotations > 0;
    return filters.usedFilter === 'used' ? used : !used;
  });
}

export async function getPurchaseRequest(id: string) {
  await requirePermission('purchase_requests.view');
  if (isOracleMode()) {
    const { findPurchaseRequestBySer } = await import('@/database/repositories/purchase-request.repository');
    const { toPurchaseRequestListRow } = await import('@/database/adapters/purchase-request.adapter');
    const ser = Number(id);
    if (Number.isNaN(ser)) return null;
    const dto = await findPurchaseRequestBySer(ser);
    return dto ? toPurchaseRequestListRow(dto) : null;
  }
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

  const optionalIds = {
    departmentId: toOptionalId(parsed.departmentId),
    warehouseId: toOptionalId(parsed.warehouseId),
    supplierId: toOptionalId(parsed.supplierId),
    currencyId: toOptionalId(parsed.currencyId),
  };

  if (optionalIds.supplierId) {
    await assertSupplierAccess(user.id, optionalIds.supplierId, 'use_in_purchase');
    await assertSupplierCurrencyAllowed(optionalIds.supplierId, optionalIds.currencyId);
  }

  if (isOracleMode()) {
    const { createPurchaseRequest: createOraclePurchaseRequest } = await import(
      '@/database/repositories/purchase-request.repository'
    );
    const { toPurchaseRequestListRow } = await import('@/database/adapters/purchase-request.adapter');
    const saved = await createOraclePurchaseRequest({
      description: parsed.notes,
      warehouseCode: optionalIds.warehouseId,
      supplierCode: optionalIds.supplierId,
      supplierName: optionalIds.supplierId,
      currencyCode: optionalIds.currencyId,
      referenceNo: parsed.referenceNo,
      requiredDate: parsed.requiredDate ? new Date(parsed.requiredDate) : null,
      requesterUnit: parsed.requesterUnit,
      date: parsed.requestDate ? new Date(parsed.requestDate) : new Date(),
      lines: parsed.items.map((item) => ({
        itemCode: item.itemId,
        quantity: item.quantity,
        unit: item.unitId ?? 'EA',
        factorToBase: item.factorToBase ?? 1,
        warehouseCode: optionalIds.warehouseId,
        description: item.itemNameSnapshot,
      })),
    });
    const result = toPurchaseRequestListRow(saved);
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

  const documentNo = await getNextDocumentNo('PURCHASE_REQUEST', parsed.branchId);
  const cycleNo = await getNextDocumentNo('PURCHASE_CYCLE', parsed.branchId);

  const totalAmount = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );

  const exchangeRate = parsed.exchangeRate ?? (await resolveExchangeRate(optionalIds.currencyId));
  const enrichedItems = await enrichPurchaseLineItems(lineItemsForEnrich(parsed.items), 'purchase');

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
  await assertDocumentMutable('PURCHASE_REQUEST', id, 'edit');
  const parsed = purchaseRequestSchema.parse(data);

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
    await assertSupplierCurrencyAllowed(optionalIds.supplierId, optionalIds.currencyId);
  }

  if (isOracleMode()) {
    const { updatePurchaseRequest: updateOraclePurchaseRequest } = await import(
      '@/database/repositories/purchase-request.repository'
    );
    const { toPurchaseRequestListRow } = await import('@/database/adapters/purchase-request.adapter');
    const saved = await updateOraclePurchaseRequest(Number(id), {
      description: parsed.notes,
      warehouseCode: optionalIds.warehouseId,
      supplierCode: optionalIds.supplierId,
      currencyCode: optionalIds.currencyId,
      referenceNo: parsed.referenceNo,
      requiredDate: parsed.requiredDate ? new Date(parsed.requiredDate) : null,
      requesterUnit: parsed.requesterUnit,
      lines: parsed.items.map((item) => ({
        itemCode: item.itemId,
        quantity: item.quantity,
        unit: item.unitId ?? 'EA',
        factorToBase: item.factorToBase ?? 1,
        warehouseCode: optionalIds.warehouseId,
        description: item.itemNameSnapshot,
      })),
    });
    const result = toPurchaseRequestListRow(saved);
    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entityType: 'PURCHASE_REQUEST',
      entityId: id,
    });
    revalidatePath(`/purchases/requests/${id}`);
    return result;
  }

  const exchangeRate = parsed.exchangeRate ?? (await resolveExchangeRate(optionalIds.currencyId));
  const enrichedItems = await enrichPurchaseLineItems(lineItemsForEnrich(parsed.items), 'purchase');

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

export async function submitPurchaseRequest(id: string, recipientUserIds?: string[]) {
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
    recipientUserIds,
  });

  revalidatePath('/purchases/requests');
  revalidatePath(`/purchases/requests/${id}`);
  return { success: true };
}

export async function deletePurchaseRequest(id: string) {
  const user = await requirePermission('purchase_requests.delete');
  await assertDocumentMutable('PURCHASE_REQUEST', id, 'delete');

  if (isOracleMode()) {
    const { deletePurchaseRequest: deleteOraclePurchaseRequest } = await import(
      '@/database/repositories/purchase-request.repository'
    );
    await deleteOraclePurchaseRequest(Number(id));
    await createAuditLog({
      userId: user.id,
      action: 'DELETE',
      entityType: 'PURCHASE_REQUEST',
      entityId: id,
    });
    revalidatePath('/purchases/requests');
    return { success: true };
  }

  const existing = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!existing) throw new Error('طلب الشراء غير موجود');

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

/** Approved purchase requests for quotation — includes already-used requests (multi-quotation per PR). */
export async function getApprovedPurchaseRequests() {
  await requirePermission('quotations.create');
  return prisma.purchaseRequest.findMany({
    where: { status: DOCUMENT_STATUS.APPROVED },
    include: { branch: true, items: true, _count: { select: { quotations: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function fetchApprovedPurchaseRequests() {
  return getApprovedPurchaseRequests();
}

export async function getPurchaseRequestUsageMap(ids: string[]) {
  await requirePermission('purchase_requests.view');
  const map = await getDocumentUsageMap('PURCHASE_REQUEST', ids);
  return Object.fromEntries(map);
}
