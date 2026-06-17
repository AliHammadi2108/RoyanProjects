'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import {
  purchaseOrderSchema,
  inspectionSchema,
  receivingSchema,
  invoiceSchema,
} from '@/lib/validations';
import { getNextDocumentNo } from '@/services/document-sequence.service';
import { createAuditLog } from '@/services/audit.service';
import { submitForApproval, DOCUMENT_TYPES } from '@/services/approval.service';
import { updateCycleStage, completeCycle } from '@/services/workflow.service';
import { DOCUMENT_STATUS, PURCHASE_STAGES, INSPECTION_RESULTS } from '@/lib/constants';
import { calculateLineTotal, toOptionalId, formatActionError } from '@/lib/utils';
import { enrichPurchaseLineItems, resolveExchangeRate } from '@/lib/purchase-line-items';
import { buildLineItemUnitFields } from '@/services/item-unit.service';
import { applyStockIn } from '@/services/stock.service';
import { flushPendingReorderNotifications } from '@/services/reorder-alert.service';
import { assertSupplierAccess } from '@/services/supplier-access.service';

// Purchase Orders
export async function getPurchaseOrders() {
  await requirePermission('purchase_orders.view');
  return prisma.purchaseOrder.findMany({
    include: { branch: true, supplier: true, creator: { select: { nameAr: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPurchaseOrder(id: string) {
  await requirePermission('purchase_orders.view');
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      branch: true,
      supplier: true,
      warehouse: true,
      currency: true,
      creator: true,
      items: { include: { item: true } },
      purchaseCycle: true,
      supplierNomination: true,
      inspections: true,
      receivings: true,
      invoices: true,
    },
  });
}

export async function createPurchaseOrder(data: unknown) {
  const user = await requirePermission('purchase_orders.create');
  const parsed = purchaseOrderSchema.parse(data);

  if (parsed.supplierNominationId) {
    const nomination = await prisma.supplierNomination.findUnique({
      where: { id: parsed.supplierNominationId },
    });
    if (!nomination || nomination.status !== DOCUMENT_STATUS.APPROVED) {
      throw new Error('يجب وجود ترشيح مورد معتمد');
    }
  }

  const documentNo = await getNextDocumentNo('PURCHASE_ORDER', parsed.branchId);
  const subtotal = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );
  const total = subtotal - parsed.discount;

  const result = await prisma.purchaseOrder.create({
    data: {
      documentNo,
      purchaseCycleId: parsed.purchaseCycleId,
      supplierNominationId: toOptionalId(parsed.supplierNominationId),
      branchId: parsed.branchId,
      supplierId: parsed.supplierId,
      warehouseId: toOptionalId(parsed.warehouseId),
      currencyId: toOptionalId(parsed.currencyId),
      paymentMethod: parsed.paymentMethod,
      expectedArrival: parsed.expectedArrival ? new Date(parsed.expectedArrival) : null,
      notes: parsed.notes,
      subtotal,
      discount: parsed.discount,
      total,
      status: DOCUMENT_STATUS.DRAFT,
      createdBy: user.id,
      items: {
        create: parsed.items.map((item, idx) => ({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitId: toOptionalId(item.unitId),
          packaging: item.packaging,
          specs: item.specs,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          price: item.unitPrice,
          freeQuantity: item.freeQuantity || 0,
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

  await updateCycleStage(
    parsed.purchaseCycleId,
    PURCHASE_STAGES.PURCHASE_ORDER,
    'في انتظار اعتماد أمر الشراء',
    { supplierId: parsed.supplierId, totalAmount: total, expectedArrival: parsed.expectedArrival ? new Date(parsed.expectedArrival) : undefined }
  );

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'PURCHASE_ORDER',
    entityId: result.id,
  });

  revalidatePath('/purchases/orders');
  return result;
}

export async function submitPurchaseOrder(id: string) {
  const user = await requirePermission('purchase_orders.submit');
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) throw new Error('أمر الشراء غير موجود');

  await submitForApproval({
    documentType: DOCUMENT_TYPES.PURCHASE_ORDER,
    documentId: id,
    documentNo: order.documentNo,
    requestedBy: user.id,
    totalAmount: order.total,
    branchId: order.branchId,
  });

  revalidatePath('/purchases/orders');
  return { success: true };
}

export async function updatePurchaseOrder(id: string, data: unknown) {
  const user = await requirePermission('purchase_orders.update');
  const parsed = purchaseOrderSchema.parse(data);
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error('أمر الشراء غير موجود');
  if (!['Draft', 'Returned For Edit'].includes(existing.status)) {
    throw new Error('لا يمكن تعديل أمر الشراء في حالته الحالية');
  }

  const subtotal = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );
  const total = subtotal - parsed.discount;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          warehouseId: toOptionalId(parsed.warehouseId),
          currencyId: toOptionalId(parsed.currencyId),
          paymentMethod: parsed.paymentMethod,
          expectedArrival: parsed.expectedArrival ? new Date(parsed.expectedArrival) : null,
          notes: parsed.notes,
          subtotal,
          discount: parsed.discount,
          total,
          updatedBy: user.id,
          items: {
            create: parsed.items.map((item, idx) => ({
              itemId: item.itemId,
              itemNameSnapshot: item.itemNameSnapshot,
              unitId: toOptionalId(item.unitId),
              packaging: item.packaging,
              specs: item.specs,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              price: item.unitPrice,
              freeQuantity: item.freeQuantity || 0,
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

  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'PURCHASE_ORDER', entityId: id });
  revalidatePath('/purchases/orders');
  revalidatePath(`/purchases/orders/${id}`);
  return result;
}

export async function deletePurchaseOrder(id: string) {
  const user = await requirePermission('purchase_orders.update');
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { inspections: true, receivings: true, invoices: true },
  });
  if (!existing) throw new Error('أمر الشراء غير موجود');
  if (existing.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف أمر الشراء إلا وهو في حالة مسودة');
  }
  if (existing.inspections.length || existing.receivings.length || existing.invoices.length) {
    throw new Error('لا يمكن حذف أمر الشراء لوجود عمليات لاحقة مرتبطة به');
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'PURCHASE_ORDER', entityId: id });
  revalidatePath('/purchases/orders');
  return { success: true };
}

// Inspections
export async function getInspections() {
  await requirePermission('inspections.view');
  return prisma.purchaseOrderInspection.findMany({
    include: { purchaseOrder: true, supplier: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInspection(id: string) {
  await requirePermission('inspections.view');
  return prisma.purchaseOrderInspection.findUnique({
    where: { id },
    include: {
      purchaseOrder: { include: { items: true } },
      supplier: true,
      warehouse: true,
      items: { include: { item: true } },
      purchaseCycle: true,
    },
  });
}

export async function createInspection(data: unknown) {
  const user = await requirePermission('inspections.create');
  const parsed = inspectionSchema.parse(data);

  const order = await prisma.purchaseOrder.findUnique({ where: { id: parsed.purchaseOrderId } });
  if (!order || order.status !== DOCUMENT_STATUS.APPROVED) {
    throw new Error('يجب أن يكون أمر الشراء معتمداً');
  }

  if (
    [INSPECTION_RESULTS.PARTIALLY_ACCEPTED, INSPECTION_RESULTS.REJECTED].includes(
      parsed.inspectionResult as 'Partially Accepted' | 'Rejected'
    ) &&
    !parsed.rejectionReason?.trim()
  ) {
    throw new Error('يجب إدخال سبب الرفض أو الملاحظات');
  }

  const documentNo = await getNextDocumentNo('INSPECTION');

  const result = await prisma.purchaseOrderInspection.create({
    data: {
      documentNo,
      purchaseCycleId: order.purchaseCycleId,
      purchaseOrderId: parsed.purchaseOrderId,
      supplierId: order.supplierId,
      warehouseId: toOptionalId(parsed.warehouseId),
      inspectionResult: parsed.inspectionResult,
      rejectionReason: parsed.rejectionReason,
      notes: parsed.notes,
      status: parsed.inspectionResult,
      createdBy: user.id,
      items: {
        create: parsed.items.map((item, idx) => ({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          quantity: item.quantity,
          matchedQty: item.matchedQty,
          unmatchedQty: item.unmatchedQty,
          freeQuantity: item.freeQuantity,
          matchStatus: item.matchStatus,
          purchaseOrderNo: order.documentNo,
          notes: item.notes,
          sortOrder: idx,
        })),
      },
    },
    include: { items: true },
  });

  if (parsed.inspectionResult !== INSPECTION_RESULTS.REJECTED) {
    await updateCycleStage(order.purchaseCycleId, PURCHASE_STAGES.INSPECTION, 'في انتظار التوريد');
  }

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'INSPECTION',
    entityId: result.id,
  });

  revalidatePath('/purchases/inspections');
  return result;
}

// Receivings
export async function getReceivings() {
  await requirePermission('receivings.view');
  return prisma.purchaseReceiving.findMany({
    include: { supplier: true, purchaseOrder: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getReceiving(id: string) {
  await requirePermission('receivings.view');
  return prisma.purchaseReceiving.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchaseOrder: true,
      warehouse: true,
      items: { include: { item: true } },
      purchaseCycle: true,
      invoices: true,
    },
  });
}

export async function createReceiving(data: unknown) {
  const user = await requirePermission('receivings.create');
  const parsed = receivingSchema.parse(data);

  await assertSupplierAccess(user.id, parsed.supplierId, 'use_in_purchase');

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: parsed.purchaseOrderId },
    include: { items: true },
  });
  if (!order || order.status !== DOCUMENT_STATUS.APPROVED) {
    throw new Error('يجب أن يكون أمر الشراء معتمداً');
  }

  if (parsed.inspectionId) {
    const inspection = await prisma.purchaseOrderInspection.findUnique({
      where: { id: parsed.inspectionId },
      include: { items: true },
    });
    if (
      !inspection ||
      ![INSPECTION_RESULTS.ACCEPTED, INSPECTION_RESULTS.PARTIALLY_ACCEPTED].includes(
        inspection.inspectionResult as 'Accepted' | 'Partially Accepted'
      )
    ) {
      throw new Error('يجب وجود فحص مقبول أو مقبول جزئياً');
    }

    for (const item of parsed.items) {
      const inspItem = inspection.items.find((i: { itemId: string; matchedQty: number }) => i.itemId === item.itemId);
      if (inspItem && item.receivedQty > inspItem.matchedQty) {
        throw new Error(`كمية الاستلام للصنف ${item.itemNameSnapshot} تتجاوز الكمية المقبولة في الفحص`);
      }
    }
  }

  const warehouseId = toOptionalId(parsed.warehouseId) ?? order.warehouseId;
  if (!warehouseId) {
    throw new Error('يجب تحديد المخزن لتحديث رصيد المخزون');
  }

  const currencyId = parsed.currencyId ?? order.currencyId;
  const exchangeRate = parsed.exchangeRate ?? (await resolveExchangeRate(currencyId));

  const enrichedItems = await Promise.all(
    parsed.items.map(async (item) => {
      const unitFields = await buildLineItemUnitFields(item.itemId, item.receivedQty, {
        itemUnitId: item.itemUnitId,
        unitId: item.unitId,
        mode: 'purchase',
      });
      return { ...item, ...unitFields };
    })
  );

  const documentNo = await getNextDocumentNo('RECEIVING', parsed.branchId);
  const totalReceived = enrichedItems.reduce((sum, i) => sum + i.receivedQty, 0);
  const totalOrdered = order.items.reduce((sum, i) => sum + (i.baseQty || i.quantity), 0);

  const receivingStatus =
    totalReceived >= totalOrdered ? 'Fully Received' : 'Partially Received';

  const result = await prisma.$transaction(async (tx) => {
    const receiving = await tx.purchaseReceiving.create({
      data: {
        documentNo,
        purchaseCycleId: order.purchaseCycleId,
        purchaseOrderId: parsed.purchaseOrderId,
        inspectionId: parsed.inspectionId,
        branchId: parsed.branchId,
        supplierId: parsed.supplierId,
        warehouseId,
        currencyId: currencyId ?? undefined,
        exchangeRate,
        supplierInvoiceNo: parsed.supplierInvoiceNo,
        supplierInvoiceDate: parsed.supplierInvoiceDate
          ? new Date(parsed.supplierInvoiceDate)
          : null,
        notes: parsed.notes,
        receivingStatus,
        createdBy: user.id,
        items: {
          create: enrichedItems.map((item, idx) => ({
            itemId: item.itemId,
            itemUnitId: item.itemUnitId,
            itemNameSnapshot: item.itemNameSnapshot,
            unitId: item.unitId,
            factorToBase: item.factorToBase,
            baseQty: item.baseQty,
            receivedQty: item.receivedQty,
            freeQuantity: item.freeQuantity,
            purchaseOrderNo: order.documentNo,
            notes: item.notes,
            sortOrder: idx,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of enrichedItems) {
      const totalQty = item.receivedQty + (item.freeQuantity ?? 0);
      if (totalQty > 0) {
        await applyStockIn(tx, {
          warehouseId,
          itemId: item.itemId,
          itemUnitId: item.itemUnitId,
          unitId: item.unitId,
          qty: totalQty,
          factorToBase: item.factorToBase,
          movementType: 'RECEIVING_IN',
          referenceType: 'RECEIVING',
          referenceId: receiving.id,
          createdBy: user.id,
        });
      }
    }

    const allReceivings = await tx.purchaseReceiving.findMany({
      where: { purchaseOrderId: parsed.purchaseOrderId },
      include: { items: true },
    });
    const totalAllReceived = allReceivings.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + (i.baseQty || i.receivedQty), 0),
      0
    );
    const orderStatus =
      totalAllReceived >= totalOrdered
        ? DOCUMENT_STATUS.FULLY_RECEIVED
        : DOCUMENT_STATUS.PARTIALLY_RECEIVED;

    await tx.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: { status: orderStatus },
    });

    return receiving;
  });

  await flushPendingReorderNotifications();

  await updateCycleStage(order.purchaseCycleId, PURCHASE_STAGES.RECEIVING, 'في انتظار الفاتورة');

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'RECEIVING',
    entityId: result.id,
  });

  revalidatePath('/purchases/receivings');
  return result;
}

// Invoices
export async function getInvoices() {
  await requirePermission('invoices.view');
  return prisma.purchaseInvoice.findMany({
    include: { supplier: true, purchaseOrder: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInvoice(id: string) {
  await requirePermission('invoices.view');
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchaseOrder: true,
      receiving: true,
      branch: true,
      items: { include: { item: true } },
      purchaseCycle: true,
    },
  });
}

export async function createInvoice(data: unknown) {
  const user = await requirePermission('invoices.create');
  const parsed = invoiceSchema.parse(data);

  const order = await prisma.purchaseOrder.findUnique({ where: { id: parsed.purchaseOrderId } });
  if (!order) throw new Error('أمر الشراء غير موجود');

  if (parsed.receivingId) {
    const receiving = await prisma.purchaseReceiving.findUnique({
      where: { id: parsed.receivingId },
      include: { items: true },
    });
    if (!receiving) throw new Error('إذن التوريد غير موجود');

    for (const item of parsed.items) {
      const recvItem = receiving.items.find((i: { itemId: string; receivedQty: number }) => i.itemId === item.itemId);
      if (recvItem && item.quantity > recvItem.receivedQty) {
        throw new Error(`كمية الفوترة للصنف ${item.itemNameSnapshot} تتجاوز الكمية المستلمة`);
      }
    }
  }

  const documentNo = await getNextDocumentNo('INVOICE', parsed.branchId);
  const subtotal = parsed.items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice, item.discount, item.tax),
    0
  );
  const netTotal = subtotal - parsed.discount + parsed.otherExpenses;

  const result = await prisma.purchaseInvoice.create({
    data: {
      documentNo,
      purchaseCycleId: order.purchaseCycleId,
      purchaseOrderId: parsed.purchaseOrderId,
      receivingId: parsed.receivingId,
      branchId: parsed.branchId,
      supplierId: parsed.supplierId,
      paymentMethod: parsed.paymentMethod,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      supplierInvoiceNo: parsed.supplierInvoiceNo,
      supplierInvoiceDate: parsed.supplierInvoiceDate
        ? new Date(parsed.supplierInvoiceDate)
        : null,
      notes: parsed.notes,
      subtotal,
      discount: parsed.discount,
      otherExpenses: parsed.otherExpenses,
      netTotal,
      supplierNet: netTotal,
      paidAmount: 0,
      remainingAmount: netTotal,
      paymentStatus: 'Unpaid',
      status: DOCUMENT_STATUS.DRAFT,
      createdBy: user.id,
      items: {
        create: parsed.items.map((item, idx) => ({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitId: toOptionalId(item.unitId),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          price: item.unitPrice,
          freeQuantity: item.freeQuantity || 0,
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

  await updateCycleStage(order.purchaseCycleId, PURCHASE_STAGES.INVOICE);
  await completeCycle(order.purchaseCycleId);

  await createAuditLog({
    userId: user.id,
    action: 'CREATE',
    entityType: 'INVOICE',
    entityId: result.id,
  });

  revalidatePath('/purchases/invoices');
  return result;
}

export async function deleteInspection(id: string) {
  const user = await requirePermission('inspections.create');
  const existing = await prisma.purchaseOrderInspection.findUnique({
    where: { id },
    include: { receivings: true },
  });
  if (!existing) throw new Error('الفحص غير موجود');
  if (existing.receivings.length > 0) {
    throw new Error('لا يمكن حذف الفحص لوجود إذونات توريد مرتبطة');
  }

  await prisma.purchaseOrderInspection.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'INSPECTION', entityId: id });
  revalidatePath('/purchases/inspections');
  return { success: true };
}

export async function deleteReceiving(id: string) {
  const user = await requirePermission('receivings.create');
  const existing = await prisma.purchaseReceiving.findUnique({
    where: { id },
    include: { invoices: true },
  });
  if (!existing) throw new Error('إذن التوريد غير موجود');
  if (existing.invoices.length > 0) {
    throw new Error('لا يمكن حذف إذن التوريد لوجود فواتير مرتبطة');
  }

  await prisma.purchaseReceiving.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'RECEIVING', entityId: id });
  revalidatePath('/purchases/receivings');
  return { success: true };
}

export async function deleteInvoice(id: string) {
  const user = await requirePermission('invoices.create');
  const existing = await prisma.purchaseInvoice.findUnique({ where: { id } });
  if (!existing) throw new Error('الفاتورة غير موجودة');
  if (existing.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف الفاتورة إلا وهي في حالة مسودة');
  }

  await prisma.purchaseInvoice.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'INVOICE', entityId: id });
  revalidatePath('/purchases/invoices');
  return { success: true };
}

export async function getApprovedOrdersForInspection() {
  await requirePermission('inspections.create');
  return prisma.purchaseOrder.findMany({
    where: { status: DOCUMENT_STATUS.APPROVED },
    include: { items: true, supplier: true },
  });
}

export async function getOrdersForReceiving() {
  await requirePermission('receivings.create');
  return prisma.purchaseOrder.findMany({
    where: {
      status: { in: [DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.PARTIALLY_RECEIVED] },
    },
    include: {
      items: true,
      supplier: true,
      inspections: {
        where: {
          inspectionResult: { in: ['Accepted', 'Partially Accepted'] },
        },
        include: { items: true },
      },
    },
  });
}

export async function getReceivingsForInvoice() {
  await requirePermission('invoices.create');
  return prisma.purchaseReceiving.findMany({
    include: {
      items: true,
      supplier: true,
      purchaseOrder: { include: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getApprovedNominations() {
  await requirePermission('purchase_orders.create');
  return prisma.supplierNomination.findMany({
    where: { status: DOCUMENT_STATUS.APPROVED },
    include: { items: true, supplier: true, purchaseCycle: true },
  });
}
