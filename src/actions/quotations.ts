'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { quotationSchema } from '@/lib/validations';
import { getNextDocumentNo } from '@/services/document-sequence.service';
import { createAuditLog } from '@/services/audit.service';
import { submitForApproval, DOCUMENT_TYPES } from '@/services/approval.service';
import { updateCycleStage } from '@/services/workflow.service';
import { DOCUMENT_STATUS, PURCHASE_STAGES } from '@/lib/constants';
import { calculateLineTotal, toOptionalId, formatActionError } from '@/lib/utils';
import { assertDocumentMutable } from '@/services/document-guard.service';
import { assertSupplierCurrencyAllowed } from '@/services/supplier-currency.service';

function buildQuotationItemRows(
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    unitId?: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    notes?: string | null;
  }>
) {
  return items.map((item, idx) => ({
    itemId: item.itemId,
    itemNameSnapshot: item.itemNameSnapshot,
    unitId: toOptionalId(item.unitId),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.quantity * item.unitPrice,
    discount: item.discount,
    tax: item.tax,
    total: calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    notes: item.notes,
    sortOrder: idx,
  }));
}

export async function getQuotations(filters?: { status?: string }) {
  await requirePermission('quotations.view');
  return prisma.quotation.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    include: {
      branch: true,
      supplier: true,
      currency: true,
      purchaseRequest: true,
      creator: { select: { nameAr: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getQuotation(id: string) {
  await requirePermission('quotations.view');
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      branch: true,
      supplier: true,
      currency: true,
      purchaseRequest: true,
      creator: true,
      items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      purchaseCycle: true,
    },
  });
}

export async function createQuotation(data: unknown) {
  const user = await requirePermission('quotations.create');
  const parsed = quotationSchema.parse(data);

  const request = await prisma.purchaseRequest.findUnique({
    where: { id: parsed.purchaseRequestId },
  });
  if (!request) throw new Error('طلب الشراء غير موجود');
  if (request.status !== DOCUMENT_STATUS.APPROVED) {
    throw new Error('لا يمكن إنشاء عرض سعر إلا من طلب شراء معتمد');
  }

  await assertSupplierCurrencyAllowed(parsed.supplierId, parsed.currencyId);

  const documentNo = await getNextDocumentNo('QUOTATION', parsed.branchId);
  const subtotal = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );
  const total = subtotal - parsed.discount - parsed.extraDiscount;

  let result;
  try {
    result = await prisma.quotation.create({
    data: {
      documentNo,
      purchaseCycleId: request.purchaseCycleId,
      purchaseRequestId: parsed.purchaseRequestId,
      branchId: parsed.branchId,
      supplierId: parsed.supplierId,
      paymentMethod: parsed.paymentMethod,
      costMethod: parsed.costMethod,
      creditPeriod: parsed.creditPeriod,
      deliveryDays: parsed.deliveryDays,
      paymentTerms: parsed.paymentTerms,
      currencyId: toOptionalId(parsed.currencyId),
      referenceNo: parsed.referenceNo,
      expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
      notes: parsed.notes,
      subtotal,
      discount: parsed.discount,
      extraDiscount: parsed.extraDiscount,
      total,
      status: DOCUMENT_STATUS.DRAFT,
      createdBy: user.id,
      items: { create: buildQuotationItemRows(parsed.items) },
    },
    include: { items: true },
  });
  } catch (err) {
    throw new Error(formatActionError(err));
  }

  await updateCycleStage(request.purchaseCycleId, PURCHASE_STAGES.QUOTATION, 'في انتظار اعتماد عرض السعر');

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'QUOTATION',
    entityId: result.id,
    newValues: { documentNo: result.documentNo },
  });

  revalidatePath('/purchases/quotations');
  return result;
}

export async function submitQuotation(id: string, recipientUserIds?: string[]) {
  const user = await requirePermission('quotations.submit');
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) throw new Error('عرض السعر غير موجود');
  if (!['Draft', 'Returned For Edit'].includes(quotation.status)) {
    throw new Error('لا يمكن إرسال عرض السعر للاعتماد في حالته الحالية');
  }

  await submitForApproval({
    documentType: DOCUMENT_TYPES.QUOTATION,
    documentId: id,
    documentNo: quotation.documentNo,
    requestedBy: user.id,
    totalAmount: quotation.total,
    branchId: quotation.branchId,
    recipientUserIds,
  });

  revalidatePath('/purchases/quotations');
  return { success: true };
}

export async function updateQuotation(id: string, data: unknown) {
  const user = await requirePermission('quotations.update');
  await assertDocumentMutable('QUOTATION', id, 'edit');
  const parsed = quotationSchema.parse(data);

  await assertSupplierCurrencyAllowed(parsed.supplierId, parsed.currencyId);

  const subtotal = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );
  const total = subtotal - parsed.discount - parsed.extraDiscount;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
        where: { id },
        data: {
          supplierId: parsed.supplierId,
          paymentMethod: parsed.paymentMethod,
          costMethod: parsed.costMethod,
          creditPeriod: parsed.creditPeriod,
          deliveryDays: parsed.deliveryDays,
          paymentTerms: parsed.paymentTerms,
          currencyId: toOptionalId(parsed.currencyId),
          referenceNo: parsed.referenceNo,
          expiryDate: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
          notes: parsed.notes,
          subtotal,
          discount: parsed.discount,
          extraDiscount: parsed.extraDiscount,
          total,
          updatedBy: user.id,
          items: { create: buildQuotationItemRows(parsed.items) },
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
    entityType: 'QUOTATION',
    entityId: id,
  });

  revalidatePath('/purchases/quotations');
  revalidatePath(`/purchases/quotations/${id}`);
  return result;
}

export async function deleteQuotation(id: string) {
  const user = await requirePermission('quotations.update');
  await assertDocumentMutable('QUOTATION', id, 'delete');
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error('عرض السعر غير موجود');

  await prisma.quotation.delete({ where: { id } });
  await createAuditLog({
    userId: user.id,
    action: 'DELETE',
    entityType: 'QUOTATION',
    entityId: id,
  });
  revalidatePath('/purchases/quotations');
  return { success: true };
}

export async function getApprovedQuotationsForRequest(purchaseRequestId: string) {
  await requirePermission('comparisons.create');
  return prisma.quotation.findMany({
    where: {
      purchaseRequestId,
      status: DOCUMENT_STATUS.APPROVED,
    },
    include: { items: true, supplier: true },
  });
}
