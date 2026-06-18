import { prisma } from '@/lib/db';
import { DOCUMENT_LABELS_AR, DOCUMENT_STATUS } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { OPERATION_CONFIG, type OperationType } from '@/lib/operation-toolbar';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { getApprovalForDocument } from '@/services/approval.service';
import type { PrintDocumentData, PrintField, PrintLineItem, PrintTotal } from '@/lib/print-types';

const OP_TO_DOC_TYPE: Partial<Record<OperationType, string>> = {
  purchase_request: 'PURCHASE_REQUEST',
  quotation: 'QUOTATION',
  comparison: 'TECHNICAL_COMPARISON',
  nomination: 'SUPPLIER_NOMINATION',
  purchase_order: 'PURCHASE_ORDER',
  supplier_payment: 'SUPPLIER_PAYMENT',
};

async function loadUnitNames(unitIds: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(unitIds.filter(Boolean)));
  if (ids.length === 0) return new Map();
  const units = await prisma.unit.findMany({
    where: { id: { in: ids } },
    select: { id: true, nameAr: true, symbol: true },
  });
  return new Map(units.map((u) => [u.id, u.symbol || u.nameAr]));
}

function statusBanner(status: string): string | undefined {
  if (status === DOCUMENT_STATUS.DRAFT) return 'مسودة — غير معتمدة';
  if (status === DOCUMENT_STATUS.CANCELLED) return 'وثيقة ملغاة';
  if (status === DOCUMENT_STATUS.PENDING_APPROVAL) return 'بانتظار الاعتماد';
  if (status === DOCUMENT_STATUS.REJECTED) return 'مرفوضة';
  return undefined;
}

async function buildApprovalInfo(
  documentType: string | undefined,
  documentId: string,
  fallbackStatus?: string
) {
  if (!documentType) {
    return fallbackStatus ? { status: fallbackStatus } : undefined;
  }
  const approval = await getApprovalForDocument(documentType, documentId);
  if (!approval) {
    return fallbackStatus ? { status: fallbackStatus } : undefined;
  }
  const approvedStep = approval.steps.find((s) => s.status === 'Approved' && s.actionUser);
  return {
    status: approval.status,
    requestedBy: approval.requester?.nameAr,
    approvedBy: approvedStep?.actionUser?.nameAr,
    approvalDate: approvedStep?.actionAt
      ? formatDateTime(approvedStep.actionAt)
      : formatDateTime(approval.requestedAt),
  };
}

function mapStandardLines(
  items: Array<{
    item?: { code?: string } | null;
    itemNameSnapshot: string;
    unitId?: string | null;
    quantity: number;
    factorToBase?: number;
    baseQty?: number;
    unitPrice?: number;
    discount?: number;
    tax?: number;
    total?: number;
    notes?: string | null;
  }>,
  unitMap: Map<string, string>
): PrintLineItem[] {
  return items.map((item) => ({
    itemCode: item.item?.code || '',
    itemName: item.itemNameSnapshot,
    unit: item.unitId ? unitMap.get(item.unitId) : undefined,
    quantity: item.quantity,
    factorToBase: item.factorToBase,
    baseQty: item.baseQty,
    unitPrice: item.unitPrice,
    discount: item.discount,
    tax: item.tax,
    total: item.total,
    notes: item.notes || undefined,
  }));
}

function field(label: string, value: string | null | undefined): PrintField | null {
  if (!value || value === '-') return null;
  return { label, value };
}

function fields(...entries: Array<PrintField | null>): PrintField[] {
  return entries.filter((e): e is PrintField => e !== null);
}

function withPrintedBy(
  data: Omit<PrintDocumentData, 'printedBy' | 'operationType' | 'documentId' | 'supplierPhone' | 'partyName'>,
  user: { nameAr: string; username: string },
  meta?: {
    operationType?: OperationType;
    documentId?: string;
    supplier?: { phone?: string | null; nameAr?: string } | null;
  }
): PrintDocumentData {
  return {
    ...data,
    printedBy: user.nameAr || user.username,
    operationType: meta?.operationType,
    documentId: meta?.documentId,
    supplierPhone: meta?.supplier?.phone ?? null,
    partyName: meta?.supplier?.nameAr,
  };
}

export async function getPrintDocument(
  operationType: OperationType,
  documentId: string
): Promise<PrintDocumentData | null> {
  const config = OPERATION_CONFIG[operationType];
  const user = await requirePermission(`${config.permissionPrefix}.view`);
  const canPrint =
    (await hasPermission(user.id, 'operations.print')) ||
    (await hasPermission(user.id, `${config.permissionPrefix}.print`));
  if (!canPrint) {
    await requirePermission('operations.print');
  }

  const title = config.listLabel.replace(/^قائمة\s+/, '');
  const docType = OP_TO_DOC_TYPE[operationType];

  switch (operationType) {
    case 'purchase_request': {
      const doc = await prisma.purchaseRequest.findUnique({
        where: { id: documentId },
        include: {
          branch: true,
          department: true,
          warehouse: true,
          supplier: true,
          currency: true,
          creator: true,
          items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!doc) return null;
      const unitMap = await loadUnitNames(doc.items.map((i) => i.unitId || ''));
      const approval = await buildApprovalInfo(docType, documentId, doc.approvalStatus);
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.requestDate),
          status: doc.status,
          approvalStatus: doc.approvalStatus,
          statusBanner: statusBanner(doc.status),
          showLinePricing: true,
          fields: fields(
            field('الفرع', doc.branch?.nameAr),
            field('الإدارة', doc.department?.nameAr),
            field('المخزن', doc.warehouse?.nameAr),
            field('المورد', doc.supplier?.nameAr),
            field('نوع الشراء', doc.purchaseType),
            field('رقم العملية', doc.operationNo),
            field('المرجع', doc.referenceNo),
            field('العملة', doc.currency ? `${doc.currency.nameAr} (${doc.currency.code})` : undefined),
            field('سعر الصرف', doc.exchangeRate !== 1 ? String(doc.exchangeRate) : undefined),
            field('تاريخ الاحتياج', formatDate(doc.requiredDate)),
            field('مقدم الطلب', doc.creator?.nameAr),
            field('وحدة الطالب', doc.requesterUnit)
          ),
          lines: mapStandardLines(doc.items, unitMap),
          totals: [{ label: 'الإجمالي', value: formatCurrency(doc.totalAmount, doc.currency?.symbol) }],
          notes: doc.notes || undefined,
          approval,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'quotation': {
      const doc = await prisma.quotation.findUnique({
        where: { id: documentId },
        include: {
          branch: true,
          supplier: true,
          currency: true,
          creator: true,
          purchaseRequest: { select: { documentNo: true } },
          items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!doc) return null;
      const unitMap = await loadUnitNames(doc.items.map((i) => i.unitId || ''));
      const approval = await buildApprovalInfo(docType, documentId, doc.approvalStatus);
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: doc.status,
          approvalStatus: doc.approvalStatus,
          statusBanner: statusBanner(doc.status),
          showLinePricing: true,
          fields: fields(
            field('المورد', doc.supplier?.nameAr),
            field('طلب الشراء', doc.purchaseRequest?.documentNo),
            field('الفرع', doc.branch?.nameAr),
            field('المرجع', doc.referenceNo),
            field('العملة', doc.currency ? `${doc.currency.nameAr} (${doc.currency.code})` : undefined),
            field('صلاحية العرض', formatDate(doc.expiryDate)),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: mapStandardLines(doc.items, unitMap),
          totals: [
            { label: 'المجموع الفرعي', value: formatCurrency(doc.subtotal, doc.currency?.symbol) },
            { label: 'الخصم', value: formatCurrency(doc.discount + doc.extraDiscount, doc.currency?.symbol) },
            { label: 'الإجمالي', value: formatCurrency(doc.total, doc.currency?.symbol) },
          ],
          notes: doc.notes || undefined,
          approval,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'comparison': {
      const doc = await prisma.technicalComparison.findUnique({
        where: { id: documentId },
        include: {
          branch: true,
          currency: true,
          creator: true,
          items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!doc) return null;
      const unitMap = await loadUnitNames(doc.items.map((i) => i.unitId || ''));
      const approval = await buildApprovalInfo(docType, documentId, doc.approvalStatus);
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: doc.status,
          approvalStatus: doc.approvalStatus,
          statusBanner: statusBanner(doc.status),
          showLinePricing: true,
          fields: fields(
            field('الفرع', doc.branch?.nameAr),
            field('العملة', doc.currency ? `${doc.currency.nameAr} (${doc.currency.code})` : undefined),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: doc.items.map((item) => ({
            itemCode: item.item?.code || '',
            itemName: item.itemNameSnapshot,
            unit: item.unitId ? unitMap.get(item.unitId) : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.netAmount,
            notes: [item.supplierName, item.quotationNo, item.notes].filter(Boolean).join(' — ') || undefined,
          })),
          totals: [{ label: 'الإجمالي', value: formatCurrency(doc.totalAmount, doc.currency?.symbol) }],
          notes: doc.notes || undefined,
          approval,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'nomination': {
      const doc = await prisma.supplierNomination.findUnique({
        where: { id: documentId },
        include: {
          branch: true,
          supplier: true,
          technicalComparison: { select: { documentNo: true } },
          creator: true,
          items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!doc) return null;
      const approval = await buildApprovalInfo(docType, documentId, doc.approvalStatus);
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: doc.status,
          approvalStatus: doc.approvalStatus,
          statusBanner: statusBanner(doc.status),
          showLinePricing: true,
          fields: fields(
            field('المورد', doc.supplier?.nameAr),
            field('المقارنة الفنية', doc.technicalComparison?.documentNo),
            field('الفرع', doc.branch?.nameAr),
            field('نوع المقارنة', doc.comparisonType),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: doc.items.map((item) => ({
            itemCode: item.item?.code || '',
            itemName: item.itemNameSnapshot,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            notes: item.notes || undefined,
          })),
          totals: [{ label: 'الإجمالي', value: formatCurrency(doc.totalAmount) }],
          notes: doc.notes || undefined,
          approval,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'purchase_order': {
      const doc = await prisma.purchaseOrder.findUnique({
        where: { id: documentId },
        include: {
          branch: true,
          supplier: true,
          warehouse: true,
          currency: true,
          creator: true,
          items: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!doc) return null;
      const unitMap = await loadUnitNames(doc.items.map((i) => i.unitId || ''));
      const approval = await buildApprovalInfo(docType, documentId, doc.approvalStatus);
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: doc.status,
          approvalStatus: doc.approvalStatus,
          statusBanner: statusBanner(doc.status),
          showLinePricing: true,
          fields: fields(
            field('المورد', doc.supplier?.nameAr),
            field('المخزن', doc.warehouse?.nameAr),
            field('الفرع', doc.branch?.nameAr),
            field('العملة', doc.currency ? `${doc.currency.nameAr} (${doc.currency.code})` : undefined),
            field('تاريخ الوصول المتوقع', formatDate(doc.expectedArrival)),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: mapStandardLines(doc.items, unitMap),
          totals: [
            { label: 'المجموع الفرعي', value: formatCurrency(doc.subtotal, doc.currency?.symbol) },
            { label: 'الخصم', value: formatCurrency(doc.discount, doc.currency?.symbol) },
            { label: 'الإجمالي', value: formatCurrency(doc.total, doc.currency?.symbol) },
          ],
          notes: doc.notes || undefined,
          approval,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'inspection': {
      const doc = await prisma.purchaseOrderInspection.findUnique({
        where: { id: documentId },
        include: {
          supplier: true,
          warehouse: true,
          purchaseOrder: { select: { documentNo: true } },
          creator: true,
          items: { include: { item: true } },
        },
      });
      if (!doc) return null;
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: doc.inspectionResult,
          statusBanner: doc.inspectionResult === 'Rejected' ? 'فحص مرفوض' : undefined,
          showLinePricing: false,
          fields: fields(
            field('أمر الشراء', doc.purchaseOrder?.documentNo),
            field('المورد', doc.supplier?.nameAr),
            field('المخزن', doc.warehouse?.nameAr),
            field('نتيجة الفحص', doc.inspectionResult),
            field('سبب الرفض', doc.rejectionReason),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: doc.items.map((item) => ({
            itemCode: item.item?.code || '',
            itemName: item.itemNameSnapshot,
            quantity: item.quantity,
            notes: `مطابق: ${item.matchedQty} | غير مطابق: ${item.unmatchedQty}`,
          })),
          totals: [],
          notes: doc.notes || undefined,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'receiving': {
      const doc = await prisma.purchaseReceiving.findUnique({
        where: { id: documentId },
        include: {
          supplier: true,
          warehouse: true,
          purchaseOrder: { select: { documentNo: true } },
          creator: true,
          items: { include: { item: true } },
        },
      });
      if (!doc) return null;
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: doc.receivingStatus,
          showLinePricing: false,
          fields: fields(
            field('أمر الشراء', doc.purchaseOrder?.documentNo),
            field('المورد', doc.supplier?.nameAr),
            field('المخزن', doc.warehouse?.nameAr),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: doc.items.map((item) => ({
            itemCode: item.item?.code || '',
            itemName: item.itemNameSnapshot,
            quantity: item.receivedQty,
            notes: item.notes || undefined,
          })),
          totals: [],
          notes: doc.notes || undefined,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'invoice': {
      const doc = await prisma.purchaseInvoice.findUnique({
        where: { id: documentId },
        include: {
          supplier: true,
          branch: true,
          purchaseOrder: { select: { documentNo: true } },
          receiving: { select: { documentNo: true } },
          creator: true,
          items: { include: { item: true } },
        },
      });
      if (!doc) return null;
      const unitMap = await loadUnitNames(doc.items.map((i) => i.unitId || ''));
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.createdAt),
          status: '',
          showLinePricing: true,
          fields: fields(
            field('المورد', doc.supplier?.nameAr),
            field('أمر الشراء', doc.purchaseOrder?.documentNo),
            field('إذن التوريد', doc.receiving?.documentNo),
            field('الفرع', doc.branch?.nameAr),
            field('رقم فاتورة المورد', doc.supplierInvoiceNo),
            field('تاريخ الاستحقاق', formatDate(doc.dueDate)),
            field('حالة السداد', doc.paymentStatus),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: mapStandardLines(doc.items, unitMap),
          totals: [
            { label: 'المجموع الفرعي', value: formatCurrency(doc.subtotal) },
            { label: 'الخصم', value: formatCurrency(doc.discount) },
            { label: 'مصاريف أخرى', value: formatCurrency(doc.otherExpenses) },
            { label: 'صافي المبلغ', value: formatCurrency(doc.netTotal) },
          ],
          notes: doc.notes || undefined,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    case 'supplier_payment': {
      const doc = await prisma.supplierPaymentVoucher.findUnique({
        where: { id: documentId },
        include: {
          supplier: true,
          branch: true,
          currency: true,
          creator: true,
          allocations: {
            include: { invoice: { select: { documentNo: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (!doc) return null;
      return withPrintedBy(
        {
          title,
          documentNo: doc.documentNo,
          documentDate: formatDate(doc.paymentDate || doc.createdAt),
          status: '',
          showLinePricing: true,
          fields: fields(
            field('المورد', doc.supplier?.nameAr),
            field('الفرع', doc.branch?.nameAr),
            field('العملة', doc.currency ? `${doc.currency.nameAr} (${doc.currency.code})` : undefined),
            field('سعر الصرف', doc.exchangeRate !== 1 ? String(doc.exchangeRate) : undefined),
            field('طريقة الدفع', doc.paymentMethod),
            field('مرجع الدفع', doc.bankReference),
            field('المُنشئ', doc.creator?.nameAr)
          ),
          lines: doc.allocations.map((a) => ({
            itemCode: a.invoice?.documentNo || '',
            itemName: `فاتورة ${a.invoice?.documentNo || ''}`,
            quantity: 1,
            total: a.allocatedAmount,
          })),
          totals: [{ label: 'إجمالي المدفوع', value: formatCurrency(doc.totalAmount, doc.currency?.symbol) }],
          notes: doc.notes || undefined,
        },
        user,
        {
          operationType,
          documentId,
          supplier: (doc as { supplier?: { phone?: string | null; nameAr?: string } }).supplier ?? null,
        }
      );
    }

    default:
      return null;
  }
}

export function getPrintDocumentTypeLabel(operationType: OperationType): string {
  const map: Record<OperationType, string> = {
    purchase_request: DOCUMENT_LABELS_AR.PURCHASE_REQUEST,
    quotation: DOCUMENT_LABELS_AR.QUOTATION,
    comparison: DOCUMENT_LABELS_AR.TECHNICAL_COMPARISON,
    nomination: DOCUMENT_LABELS_AR.SUPPLIER_NOMINATION,
    purchase_order: DOCUMENT_LABELS_AR.PURCHASE_ORDER,
    inspection: DOCUMENT_LABELS_AR.INSPECTION,
    receiving: DOCUMENT_LABELS_AR.RECEIVING,
    invoice: DOCUMENT_LABELS_AR.INVOICE,
    supplier_payment: DOCUMENT_LABELS_AR.SUPPLIER_PAYMENT,
  };
  return map[operationType];
}
