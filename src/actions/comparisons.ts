'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { comparisonSchema, nominationSchema } from '@/lib/validations';
import { getNextDocumentNo } from '@/services/document-sequence.service';
import { createAuditLog } from '@/services/audit.service';
import { submitForApproval, DOCUMENT_TYPES } from '@/services/approval.service';
import { updateCycleStage } from '@/services/workflow.service';
import { DOCUMENT_STATUS, PURCHASE_STAGES } from '@/lib/constants';
import { toOptionalId, formatActionError } from '@/lib/utils';

export async function getComparisons() {
  await requirePermission('comparisons.view');
  return prisma.technicalComparison.findMany({
    include: { branch: true, creator: { select: { nameAr: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getComparison(id: string) {
  await requirePermission('comparisons.view');
  return prisma.technicalComparison.findUnique({
    where: { id },
    include: {
      branch: true,
      currency: true,
      creator: true,
      items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      purchaseCycle: true,
      nominations: true,
    },
  });
}

export async function createComparison(data: unknown) {
  const user = await requirePermission('comparisons.create');
  const parsed = comparisonSchema.parse(data);

  const quotations = await prisma.quotation.findMany({
    where: { id: { in: parsed.quotationIds }, status: DOCUMENT_STATUS.APPROVED },
  });
  if (quotations.length === 0) {
    throw new Error('يجب اختيار عروض أسعار معتمدة');
  }

  const documentNo = await getNextDocumentNo('TECHNICAL_COMPARISON', parsed.branchId);
  const totalAmount = parsed.items.reduce((sum, item) => sum + item.netAmount, 0);

  const result = await prisma.technicalComparison.create({
    data: {
      documentNo,
      purchaseCycleId: parsed.purchaseCycleId,
      branchId: parsed.branchId,
        currencyId: toOptionalId(parsed.currencyId),
      paymentMethod: parsed.paymentMethod,
      quotationIds: parsed.quotationIds.join(','),
      notes: parsed.notes,
      totalAmount,
      status: DOCUMENT_STATUS.DRAFT,
      createdBy: user.id,
      items: {
        create: parsed.items.map((item, idx) => ({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitId: item.unitId,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          netAmount: item.netAmount,
          isSelected: item.isSelected,
          quotationId: item.quotationId,
          quotationNo: item.quotationNo,
          notes: item.notes,
          sortOrder: idx,
        })),
      },
    },
    include: { items: true },
  });

  await updateCycleStage(parsed.purchaseCycleId, PURCHASE_STAGES.TECHNICAL_COMPARISON);

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'TECHNICAL_COMPARISON',
    entityId: result.id,
  });

  revalidatePath('/purchases/comparisons');
  return result;
}

export async function submitComparison(id: string) {
  const user = await requirePermission('comparisons.submit');
  const comparison = await prisma.technicalComparison.findUnique({ where: { id } });
  if (!comparison) throw new Error('المقارنة غير موجودة');

  await submitForApproval({
    documentType: DOCUMENT_TYPES.TECHNICAL_COMPARISON,
    documentId: id,
    documentNo: comparison.documentNo,
    requestedBy: user.id,
    totalAmount: comparison.totalAmount,
    branchId: comparison.branchId,
  });

  revalidatePath('/purchases/comparisons');
  return { success: true };
}

export async function updateComparison(id: string, data: unknown) {
  const user = await requirePermission('comparisons.update');
  const parsed = comparisonSchema.parse(data);
  const existing = await prisma.technicalComparison.findUnique({ where: { id } });
  if (!existing) throw new Error('المقارنة غير موجودة');
  if (!['Draft', 'Returned For Edit'].includes(existing.status)) {
    throw new Error('لا يمكن تعديل المقارنة في حالتها الحالية');
  }

  const totalAmount = parsed.items.reduce((sum, item) => sum + item.netAmount, 0);

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      await tx.technicalComparisonItem.deleteMany({ where: { technicalComparisonId: id } });
      return tx.technicalComparison.update({
        where: { id },
        data: {
          currencyId: toOptionalId(parsed.currencyId),
          paymentMethod: parsed.paymentMethod,
          quotationIds: parsed.quotationIds.join(','),
          notes: parsed.notes,
          totalAmount,
          updatedBy: user.id,
          items: {
            create: parsed.items.map((item, idx) => ({
              itemId: item.itemId,
              itemNameSnapshot: item.itemNameSnapshot,
              unitId: toOptionalId(item.unitId),
              supplierId: toOptionalId(item.supplierId),
              supplierName: item.supplierName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              netAmount: item.netAmount,
              isSelected: item.isSelected,
              quotationId: toOptionalId(item.quotationId),
              quotationNo: item.quotationNo,
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

  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'TECHNICAL_COMPARISON', entityId: id });
  revalidatePath('/purchases/comparisons');
  revalidatePath(`/purchases/comparisons/${id}`);
  return result;
}

export async function deleteComparison(id: string) {
  const user = await requirePermission('comparisons.update');
  const existing = await prisma.technicalComparison.findUnique({
    where: { id },
    include: { nominations: true },
  });
  if (!existing) throw new Error('المقارنة غير موجودة');
  if (existing.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف المقارنة إلا وهي في حالة مسودة');
  }
  if (existing.nominations.length > 0) {
    throw new Error('لا يمكن حذف المقارنة لوجود ترشيحات مرتبطة بها');
  }

  await prisma.technicalComparison.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'TECHNICAL_COMPARISON', entityId: id });
  revalidatePath('/purchases/comparisons');
  return { success: true };
}

// Supplier Nominations
export async function getNominations() {
  await requirePermission('supplier_selection.view');
  return prisma.supplierNomination.findMany({
    include: { branch: true, supplier: true, technicalComparison: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getNomination(id: string) {
  await requirePermission('supplier_selection.view');
  return prisma.supplierNomination.findUnique({
    where: { id },
    include: {
      branch: true,
      supplier: true,
      technicalComparison: true,
      items: { include: { item: true } },
      purchaseCycle: true,
      orders: true,
    },
  });
}

export async function createNomination(data: unknown) {
  const user = await requirePermission('supplier_selection.create');
  const parsed = nominationSchema.parse(data);

  const comparison = await prisma.technicalComparison.findUnique({
    where: { id: parsed.technicalComparisonId },
  });
  if (!comparison || comparison.status !== DOCUMENT_STATUS.APPROVED) {
    throw new Error('يجب أن تكون المقارنة الفنية معتمدة');
  }

  const documentNo = await getNextDocumentNo('SUPPLIER_NOMINATION', parsed.branchId);
  const totalAmount = parsed.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const mainSupplierId = toOptionalId(parsed.supplierId) || toOptionalId(parsed.items[0]?.supplierId);

  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'nomination_requires_approval' },
  });
  const requiresApproval = setting?.value !== 'false';

  const result = await prisma.supplierNomination.create({
    data: {
      documentNo,
      purchaseCycleId: comparison.purchaseCycleId,
      technicalComparisonId: parsed.technicalComparisonId,
      branchId: parsed.branchId,
      supplierId: mainSupplierId,
      comparisonType: parsed.comparisonType,
      committeeMembers: parsed.committeeMembers,
      notes: parsed.notes,
      totalAmount,
      status: requiresApproval ? DOCUMENT_STATUS.DRAFT : DOCUMENT_STATUS.APPROVED,
      approvalStatus: requiresApproval ? 'None' : 'Approved',
      createdBy: user.id,
      items: {
        create: parsed.items.map((item, idx) => ({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          netAmount: item.quantity * item.unitPrice,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          quotationId: item.quotationId,
          isApproved: item.isApproved,
          technicalComparisonId: parsed.technicalComparisonId,
          sortOrder: idx,
        })),
      },
    },
    include: { items: true },
  });

  await updateCycleStage(
    comparison.purchaseCycleId,
    PURCHASE_STAGES.SUPPLIER_NOMINATION,
    'في انتظار أمر الشراء',
    { supplierId: mainSupplierId || undefined, totalAmount }
  );

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'SUPPLIER_NOMINATION',
    entityId: result.id,
  });

  revalidatePath('/purchases/supplier-selection');
  return result;
}

export async function submitNomination(id: string) {
  const user = await requirePermission('comparisons.submit');
  const nomination = await prisma.supplierNomination.findUnique({ where: { id } });
  if (!nomination) throw new Error('الترشيح غير موجود');

  await submitForApproval({
    documentType: DOCUMENT_TYPES.SUPPLIER_NOMINATION,
    documentId: id,
    documentNo: nomination.documentNo,
    requestedBy: user.id,
    totalAmount: nomination.totalAmount,
    branchId: nomination.branchId,
  });

  revalidatePath('/purchases/supplier-selection');
  return { success: true };
}

export async function updateNomination(id: string, data: unknown) {
  const user = await requirePermission('supplier_selection.create');
  const parsed = nominationSchema.parse(data);
  const existing = await prisma.supplierNomination.findUnique({ where: { id } });
  if (!existing) throw new Error('الترشيح غير موجود');
  if (!['Draft', 'Returned For Edit'].includes(existing.status)) {
    throw new Error('لا يمكن تعديل الترشيح في حالته الحالية');
  }

  const totalAmount = parsed.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const mainSupplierId = toOptionalId(parsed.supplierId) || toOptionalId(parsed.items[0]?.supplierId);

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      await tx.supplierNominationItem.deleteMany({ where: { supplierNominationId: id } });
      return tx.supplierNomination.update({
        where: { id },
        data: {
          supplierId: mainSupplierId,
          comparisonType: parsed.comparisonType,
          committeeMembers: parsed.committeeMembers,
          notes: parsed.notes,
          totalAmount,
          updatedBy: user.id,
          items: {
            create: parsed.items.map((item, idx) => ({
              itemId: item.itemId,
              itemNameSnapshot: item.itemNameSnapshot,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              netAmount: item.quantity * item.unitPrice,
              supplierId: toOptionalId(item.supplierId),
              supplierName: item.supplierName,
              quotationId: toOptionalId(item.quotationId),
              isApproved: item.isApproved,
              technicalComparisonId: existing.technicalComparisonId,
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

  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'SUPPLIER_NOMINATION', entityId: id });
  revalidatePath('/purchases/supplier-selection');
  revalidatePath(`/purchases/supplier-selection/${id}`);
  return result;
}

export async function deleteNomination(id: string) {
  const user = await requirePermission('supplier_selection.create');
  const existing = await prisma.supplierNomination.findUnique({
    where: { id },
    include: { orders: true },
  });
  if (!existing) throw new Error('الترشيح غير موجود');
  if (existing.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف الترشيح إلا وهو في حالة مسودة');
  }
  if (existing.orders.length > 0) {
    throw new Error('لا يمكن حذف الترشيح لوجود أوامر شراء مرتبطة');
  }

  await prisma.supplierNomination.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'SUPPLIER_NOMINATION', entityId: id });
  revalidatePath('/purchases/supplier-selection');
  return { success: true };
}

export async function getApprovedComparisons() {
  await requirePermission('supplier_selection.create');
  return prisma.technicalComparison.findMany({
    where: { status: DOCUMENT_STATUS.APPROVED },
    include: { items: true },
  });
}

export async function getApprovedComparisonsForPurchaseOrder() {
  await requirePermission('purchase_orders.create');
  return prisma.technicalComparison.findMany({
    where: { status: DOCUMENT_STATUS.APPROVED },
    include: { items: true, currency: true },
    orderBy: { createdAt: 'desc' },
  });
}
