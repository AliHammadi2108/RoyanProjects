import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { DOCUMENT_STATUS, PAYABLE_INVOICE_STATUSES } from '@/lib/constants';
import { computeInvoiceRemaining } from '@/lib/invoice-payment';
import { getNextDocumentNo } from '@/services/document-sequence.service';
import { assertSupplierAccess } from '@/services/supplier-access.service';
import { assertSupplierCurrencyAllowed } from '@/services/supplier-currency.service';
import { createAuditLog } from '@/services/audit.service';

const NON_EDITABLE = [
  DOCUMENT_STATUS.PENDING_APPROVAL,
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.POSTED,
  DOCUMENT_STATUS.CANCELLED,
];

export interface PaymentAllocationInput {
  invoiceId: string;
  allocatedAmount: number;
}

export interface SupplierPaymentInput {
  branchId: string;
  supplierId: string;
  currencyId?: string | null;
  exchangeRate?: number;
  paymentDate?: string;
  paymentMethod?: string | null;
  bankReference?: string | null;
  notes?: string | null;
  totalAmount: number;
  allocations: PaymentAllocationInput[];
}

function computeInvoicePaymentStatus(
  netTotal: number,
  paidAmount: number,
  dueDate?: Date | null
): string {
  const remaining = Math.max(0, netTotal - paidAmount);
  if (remaining <= 0.001) return 'Paid';
  if (paidAmount > 0) {
    if (dueDate && dueDate < new Date()) return 'Overdue';
    return 'Partially Paid';
  }
  if (dueDate && dueDate < new Date()) return 'Overdue';
  return 'Unpaid';
}

export async function assertPaymentVoucherMutable(
  voucherId: string,
  action: 'edit' | 'delete' | 'cancel' = 'edit'
) {
  const voucher = await prisma.supplierPaymentVoucher.findUnique({ where: { id: voucherId } });
  if (!voucher) throw new Error('سند الصرف غير موجود');

  if (action === 'delete' && voucher.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف السند إلا وهو في حالة مسودة');
  }

  if (action === 'edit' && (NON_EDITABLE as readonly string[]).includes(voucher.status)) {
    throw new Error('لا يمكن تعديل السند في حالته الحالية');
  }

  if (action === 'cancel' && voucher.status === DOCUMENT_STATUS.POSTED) {
    throw new Error('لا يمكن إلغاء سند مرحّل');
  }

  return voucher;
}

async function validateAllocations(
  supplierId: string,
  totalAmount: number,
  allocations: PaymentAllocationInput[],
  excludeVoucherId?: string
) {
  if (allocations.length === 0) {
    throw new Error('يجب تخصيص مبلغ الدفع على فاتورة واحدة على الأقل');
  }

  const allocatedSum = allocations.reduce((s, a) => s + a.allocatedAmount, 0);
  if (allocatedSum > totalAmount + 0.001) {
    throw new Error('مجموع التخصيصات يتجاوز مبلغ السند');
  }

  const invoiceIds = allocations.map((a) => a.invoiceId);
  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      id: { in: invoiceIds },
      supplierId,
      status: { in: [...PAYABLE_INVOICE_STATUSES] },
    },
  });

  if (invoices.length !== invoiceIds.length) {
    throw new Error('بعض الفواتير غير صالحة أو لا تخص المورد المحدد');
  }

  for (const alloc of allocations) {
    if (alloc.allocatedAmount <= 0) {
      throw new Error('مبلغ التخصيص يجب أن يكون أكبر من صفر');
    }
    const invoice = invoices.find((i) => i.id === alloc.invoiceId)!;
    let available = computeInvoiceRemaining(
      invoice.netTotal,
      invoice.paidAmount,
      invoice.remainingAmount
    );

    if (excludeVoucherId) {
      const existingAlloc = await prisma.supplierPaymentAllocation.findUnique({
        where: { voucherId_invoiceId: { voucherId: excludeVoucherId, invoiceId: alloc.invoiceId } },
      });
      if (existingAlloc) available += existingAlloc.allocatedAmount;
    }

    if (alloc.allocatedAmount > available + 0.001) {
      throw new Error(`مبلغ التخصيص للفاتورة ${invoice.documentNo} يتجاوز المبلغ المتبقي`);
    }
  }
}

async function applyAllocationsToInvoices(
  tx: Prisma.TransactionClient,
  allocations: Array<{ invoiceId: string; allocatedAmount: number }>
) {
  for (const alloc of allocations) {
    const invoice = await tx.purchaseInvoice.findUnique({ where: { id: alloc.invoiceId } });
    if (!invoice) throw new Error('فاتورة غير موجودة');

    const currentRemaining = computeInvoiceRemaining(
      invoice.netTotal,
      invoice.paidAmount,
      invoice.remainingAmount
    );
    if (alloc.allocatedAmount > currentRemaining + 0.001) {
      throw new Error(`المبلغ المتبقي للفاتورة ${invoice.documentNo} غير كافٍ`);
    }

    const newPaid = (invoice.paidAmount ?? 0) + alloc.allocatedAmount;
    const newRemaining = Math.max(0, invoice.netTotal - newPaid);

    await tx.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: computeInvoicePaymentStatus(
          invoice.netTotal,
          newPaid,
          invoice.dueDate || invoice.paymentDueDate
        ),
      },
    });
  }
}

export async function listSupplierPaymentVouchers(userId: string, supplierId?: string) {
  const allowed = await import('@/services/supplier-access.service').then((m) =>
    m.getAllowedSupplierIds(userId, 'use_in_purchase')
  );

  return prisma.supplierPaymentVoucher.findMany({
    where: {
      ...(supplierId ? { supplierId } : {}),
      ...(allowed === null
        ? {}
        : { supplierId: { in: allowed.length > 0 ? allowed : ['__none__'] } }),
    },
    include: {
      supplier: { select: { id: true, code: true, nameAr: true } },
      branch: { select: { id: true, nameAr: true } },
      currency: { select: { id: true, code: true, symbol: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSupplierPaymentVoucher(id: string) {
  return prisma.supplierPaymentVoucher.findUnique({
    where: { id },
    include: {
      supplier: { include: { defaultCurrency: true } },
      branch: true,
      currency: true,
      allocations: {
        include: {
          invoice: {
            select: {
              id: true,
              documentNo: true,
              netTotal: true,
              paidAmount: true,
              remainingAmount: true,
              paymentStatus: true,
              dueDate: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      creator: { select: { id: true, nameAr: true } },
    },
  });
}

export async function getOpenInvoicesForSupplier(userId: string, supplierId: string) {
  await assertSupplierAccess(userId, supplierId, 'use_in_purchase');

  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      supplierId,
      status: { in: [...PAYABLE_INVOICE_STATUSES] },
    },
    include: { currency: true },
    orderBy: { createdAt: 'asc' },
  });

  return invoices
    .map((inv) => {
      const paid = inv.paidAmount ?? 0;
      const remaining = computeInvoiceRemaining(inv.netTotal, paid, inv.remainingAmount);
      return {
        id: inv.id,
        documentNo: inv.documentNo,
        netTotal: inv.netTotal,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentStatus: inv.paymentStatus,
        dueDate: inv.dueDate,
        exchangeRate: inv.exchangeRate,
        currencyCode: inv.currency?.code,
        currencyId: inv.currencyId,
      };
    })
    .filter((inv) => inv.remainingAmount > 0.001);
}

export async function createSupplierPaymentVoucher(userId: string, data: SupplierPaymentInput) {
  await assertSupplierAccess(userId, data.supplierId, 'use_in_purchase');
  await assertSupplierCurrencyAllowed(data.supplierId, data.currencyId);
  await validateAllocations(data.supplierId, data.totalAmount, data.allocations);

  const documentNo = await getNextDocumentNo('SUPPLIER_PAYMENT', data.branchId);
  const allocatedAmount = data.allocations.reduce((s, a) => s + a.allocatedAmount, 0);

  const result = await prisma.$transaction(async (tx) => {
    const voucher = await tx.supplierPaymentVoucher.create({
      data: {
        documentNo,
        branchId: data.branchId,
        supplierId: data.supplierId,
        currencyId: data.currencyId || null,
        exchangeRate: data.exchangeRate ?? 1,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: data.paymentMethod,
        bankReference: data.bankReference,
        notes: data.notes,
        totalAmount: data.totalAmount,
        allocatedAmount,
        status: DOCUMENT_STATUS.POSTED,
        approvalStatus: 'None',
        postedBy: userId,
        postedAt: new Date(),
        createdBy: userId,
        allocations: {
          create: data.allocations.map((a, idx) => ({
            invoiceId: a.invoiceId,
            allocatedAmount: a.allocatedAmount,
            sortOrder: idx,
          })),
        },
      },
      include: { allocations: true },
    });

    await applyAllocationsToInvoices(tx, voucher.allocations);
    return voucher;
  });

  await createAuditLog({
    userId,
    action: 'CREATE',
    entityType: 'SUPPLIER_PAYMENT',
    entityId: result.id,
  });

  return result;
}

export async function updateSupplierPaymentVoucher(
  userId: string,
  id: string,
  data: SupplierPaymentInput
) {
  await assertPaymentVoucherMutable(id, 'edit');
  await assertSupplierAccess(userId, data.supplierId, 'use_in_purchase');
  await assertSupplierCurrencyAllowed(data.supplierId, data.currencyId);
  await validateAllocations(data.supplierId, data.totalAmount, data.allocations, id);

  const allocatedAmount = data.allocations.reduce((s, a) => s + a.allocatedAmount, 0);

  const result = await prisma.$transaction(async (tx) => {
    await tx.supplierPaymentAllocation.deleteMany({ where: { voucherId: id } });
    const voucher = await tx.supplierPaymentVoucher.update({
      where: { id },
      data: {
        branchId: data.branchId,
        supplierId: data.supplierId,
        currencyId: data.currencyId || null,
        exchangeRate: data.exchangeRate ?? 1,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        paymentMethod: data.paymentMethod,
        bankReference: data.bankReference,
        notes: data.notes,
        totalAmount: data.totalAmount,
        allocatedAmount,
        status: DOCUMENT_STATUS.POSTED,
        approvalStatus: 'None',
        postedBy: userId,
        postedAt: new Date(),
        allocations: {
          create: data.allocations.map((a, idx) => ({
            invoiceId: a.invoiceId,
            allocatedAmount: a.allocatedAmount,
            sortOrder: idx,
          })),
        },
      },
      include: { allocations: true },
    });

    await applyAllocationsToInvoices(tx, voucher.allocations);
    return voucher;
  });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    entityType: 'SUPPLIER_PAYMENT',
    entityId: id,
  });

  return result;
}

export async function deleteSupplierPaymentVoucher(userId: string, id: string) {
  await assertPaymentVoucherMutable(id, 'delete');
  await prisma.supplierPaymentVoucher.delete({ where: { id } });
  await createAuditLog({
    userId,
    action: 'DELETE',
    entityType: 'SUPPLIER_PAYMENT',
    entityId: id,
  });
  return { success: true };
}

/** @deprecated Legacy vouchers only — new saves post immediately */
export async function postSupplierPaymentVoucher(userId: string, id: string) {
  const voucher = await prisma.supplierPaymentVoucher.findUnique({
    where: { id },
    include: { allocations: true },
  });
  if (!voucher) throw new Error('سند الصرف غير موجود');
  if (voucher.status === DOCUMENT_STATUS.POSTED) {
    throw new Error('السند مرحّل مسبقاً');
  }
  if (
    voucher.status !== DOCUMENT_STATUS.APPROVED &&
    voucher.status !== DOCUMENT_STATUS.DRAFT &&
    voucher.status !== DOCUMENT_STATUS.PENDING_APPROVAL
  ) {
    throw new Error('لا يمكن ترحيل السند في حالته الحالية');
  }

  await prisma.$transaction(async (tx) => {
    await applyAllocationsToInvoices(tx, voucher.allocations);
    await tx.supplierPaymentVoucher.update({
      where: { id },
      data: {
        status: DOCUMENT_STATUS.POSTED,
        postedBy: userId,
        postedAt: new Date(),
      },
    });
  });

  await createAuditLog({
    userId,
    action: 'POST',
    entityType: 'SUPPLIER_PAYMENT',
    entityId: id,
  });

  return { success: true };
}

export async function cancelSupplierPaymentVoucher(userId: string, id: string) {
  await assertPaymentVoucherMutable(id, 'cancel');
  await prisma.supplierPaymentVoucher.update({
    where: { id },
    data: {
      status: DOCUMENT_STATUS.CANCELLED,
      approvalStatus: 'Cancelled',
    },
  });
  await createAuditLog({
    userId,
    action: 'CANCEL',
    entityType: 'SUPPLIER_PAYMENT',
    entityId: id,
  });
  return { success: true };
}
