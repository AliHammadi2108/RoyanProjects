import { prisma } from '@/lib/db';
import { DOCUMENT_STATUS, DOCUMENT_TYPES, PAYABLE_INVOICE_STATUSES } from '@/lib/constants';
import { computeInvoiceRemaining } from '@/lib/invoice-payment';
import { getNextDocumentNo } from '@/services/document-sequence.service';
import { assertSupplierAccess } from '@/services/supplier-access.service';
import { assertSupplierCurrencyAllowed } from '@/services/supplier-currency.service';
import { createAuditLog } from '@/services/audit.service';
import { submitForApproval } from '@/services/approval.service';

const LOCKED_STATUSES = [DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.POSTED, DOCUMENT_STATUS.CANCELLED];
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
  if (!voucher) throw new Error('ط³ظ†ط¯ ط§ظ„طµط±ظپ ط؛ظٹط± ظ…ظˆط¬ظˆط¯');

  if (action === 'delete' && voucher.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ط§ظ„ط³ظ†ط¯ ط¥ظ„ط§ ظˆظ‡ظˆ ظپظٹ ط­ط§ظ„ط© ظ…ط³ظˆط¯ط©');
  }

  if (action === 'edit' && (NON_EDITABLE as readonly string[]).includes(voucher.status)) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† طھط¹ط¯ظٹظ„ ط§ظ„ط³ظ†ط¯ ظپظٹ ط­ط§ظ„طھظ‡ ط§ظ„ط­ط§ظ„ظٹط©');
  }

  if (action === 'cancel' && voucher.status === DOCUMENT_STATUS.POSTED) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† ط¥ظ„ط؛ط§ط، ط³ظ†ط¯ ظ…ط±ط­ظ‘ظ„');
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
    throw new Error('ظٹط¬ط¨ طھط®طµظٹطµ ظ…ط¨ظ„ط؛ ط§ظ„ط¯ظپط¹ ط¹ظ„ظ‰ ظپط§طھظˆط±ط© ظˆط§ط­ط¯ط© ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„');
  }

  const allocatedSum = allocations.reduce((s, a) => s + a.allocatedAmount, 0);
  if (allocatedSum > totalAmount + 0.001) {
    throw new Error('ظ…ط¬ظ…ظˆط¹ ط§ظ„طھط®طµظٹطµط§طھ ظٹطھط¬ط§ظˆط² ظ…ط¨ظ„ط؛ ط§ظ„ط³ظ†ط¯');
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
    throw new Error('ط¨ط¹ط¶ ط§ظ„ظپظˆط§طھظٹط± ط؛ظٹط± طµط§ظ„ط­ط© ط£ظˆ ظ„ط§ طھط®طµ ط§ظ„ظ…ظˆط±ط¯ ط§ظ„ظ…ط­ط¯ط¯');
  }

  for (const alloc of allocations) {
    if (alloc.allocatedAmount <= 0) {
      throw new Error('ظ…ط¨ظ„ط؛ ط§ظ„طھط®طµظٹطµ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط£ظƒط¨ط± ظ…ظ† طµظپط±');
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
      throw new Error(`ظ…ط¨ظ„ط؛ ط§ظ„طھط®طµظٹطµ ظ„ظ„ظپط§طھظˆط±ط© ${invoice.documentNo} ظٹطھط¬ط§ظˆط² ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…طھط¨ظ‚ظٹ`);
    }
  }
}

export async function listSupplierPaymentVouchers(userId: string, supplierId?: string) {
  const allowed = await import('@/services/supplier-access.service').then((m) =>
    m.getAllowedSupplierIds(userId, 'view_balance')
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
  await assertSupplierAccess(userId, supplierId, 'view_balance');

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

  const result = await prisma.supplierPaymentVoucher.create({
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
      status: DOCUMENT_STATUS.DRAFT,
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
    return tx.supplierPaymentVoucher.update({
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

export async function submitSupplierPaymentForApproval(
  userId: string,
  id: string,
  recipientUserIds?: string[]
) {
  const voucher = await assertPaymentVoucherMutable(id, 'edit');

  await prisma.supplierPaymentVoucher.update({
    where: { id },
    data: {
      status: DOCUMENT_STATUS.PENDING_APPROVAL,
      approvalStatus: 'Pending',
    },
  });

  await submitForApproval({
    documentType: DOCUMENT_TYPES.SUPPLIER_PAYMENT,
    documentId: id,
    documentNo: voucher.documentNo,
    requestedBy: userId,
    totalAmount: voucher.totalAmount,
    branchId: voucher.branchId,
    recipientUserIds,
  });

  return { success: true };
}

export async function postSupplierPaymentVoucher(userId: string, id: string) {
  const voucher = await prisma.supplierPaymentVoucher.findUnique({
    where: { id },
    include: { allocations: true },
  });
  if (!voucher) throw new Error('ط³ظ†ط¯ ط§ظ„طµط±ظپ ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
  if (voucher.status === DOCUMENT_STATUS.POSTED) {
    throw new Error('ط§ظ„ط³ظ†ط¯ ظ…ط±ط­ظ‘ظ„ ظ…ط³ط¨ظ‚ط§ظ‹');
  }
  if (voucher.status !== DOCUMENT_STATUS.APPROVED && voucher.status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† طھط±ط­ظٹظ„ ط§ظ„ط³ظ†ط¯ ظپظٹ ط­ط§ظ„طھظ‡ ط§ظ„ط­ط§ظ„ظٹط©');
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.supplierPaymentVoucher.findUnique({
      where: { id },
      include: { allocations: true },
    });
    if (!fresh || fresh.status === DOCUMENT_STATUS.POSTED) {
      throw new Error('ط§ظ„ط³ظ†ط¯ ط؛ظٹط± ظ…طھط§ط­ ظ„ظ„طھط±ط­ظٹظ„');
    }

    for (const alloc of fresh.allocations) {
      const invoice = await tx.purchaseInvoice.findUnique({ where: { id: alloc.invoiceId } });
      if (!invoice) throw new Error('ظپط§طھظˆط±ط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©');

      const currentRemaining = computeInvoiceRemaining(
        invoice.netTotal,
        invoice.paidAmount,
        invoice.remainingAmount
      );
      if (alloc.allocatedAmount > currentRemaining + 0.001) {
        throw new Error(`ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ظپط§طھظˆط±ط© ${invoice.documentNo} ط؛ظٹط± ظƒط§ظپظچ`);
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

export async function approveSupplierPaymentVoucher(userId: string, id: string) {
  const voucher = await prisma.supplierPaymentVoucher.findUnique({ where: { id } });
  if (!voucher) throw new Error('ط³ظ†ط¯ ط§ظ„طµط±ظپ ط؛ظٹط± ظ…ظˆط¬ظˆط¯');
  if (voucher.status !== DOCUMENT_STATUS.PENDING_APPROVAL) {
    throw new Error('ط§ظ„ط³ظ†ط¯ ظ„ظٹط³ ط¨ط§ظ†طھط¸ط§ط± ط§ظ„ط§ط¹طھظ…ط§ط¯');
  }

  await prisma.supplierPaymentVoucher.update({
    where: { id },
    data: {
      status: DOCUMENT_STATUS.APPROVED,
      approvalStatus: 'Approved',
      approvedBy: userId,
    },
  });

  await createAuditLog({
    userId,
    action: 'APPROVE',
    entityType: 'SUPPLIER_PAYMENT',
    entityId: id,
  });

  return { success: true };
}
