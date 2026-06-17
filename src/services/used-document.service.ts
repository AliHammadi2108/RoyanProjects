import { prisma } from '@/lib/db';
import { DOCUMENT_ROUTES, DOCUMENT_LABELS_AR } from '@/lib/constants';

export type UsageDocumentType =
  | 'PURCHASE_REQUEST'
  | 'QUOTATION'
  | 'TECHNICAL_COMPARISON'
  | 'SUPPLIER_NOMINATION'
  | 'PURCHASE_ORDER'
  | 'INSPECTION'
  | 'RECEIVING';

export interface DocumentUsageInfo {
  isUsed: boolean;
  label?: string;
  childType?: string;
  childId?: string;
  childNo?: string;
  childRoute?: string;
}

const USAGE_LABEL = 'مستخدم';

function usage(
  childType: string,
  childId: string,
  childNo: string
): DocumentUsageInfo {
  return {
    isUsed: true,
    label: USAGE_LABEL,
    childType,
    childId,
    childNo,
    childRoute: `${DOCUMENT_ROUTES[childType] || '/purchases/tracking'}/${childId}`,
  };
}

export async function getDocumentUsage(
  documentType: UsageDocumentType,
  documentId: string
): Promise<DocumentUsageInfo> {
  const map = await getDocumentUsageMap(documentType, [documentId]);
  return map.get(documentId) || { isUsed: false };
}

export async function getDocumentUsageMap(
  documentType: UsageDocumentType,
  documentIds: string[]
): Promise<Map<string, DocumentUsageInfo>> {
  const result = new Map<string, DocumentUsageInfo>();
  if (documentIds.length === 0) return result;

  switch (documentType) {
    case 'PURCHASE_REQUEST': {
      const children = await prisma.quotation.findMany({
        where: { purchaseRequestId: { in: documentIds } },
        select: { id: true, documentNo: true, purchaseRequestId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of children) {
        if (!result.has(child.purchaseRequestId)) {
          result.set(child.purchaseRequestId, usage('QUOTATION', child.id, child.documentNo));
        }
      }
      break;
    }
    case 'QUOTATION': {
      const items = await prisma.technicalComparisonItem.findMany({
        where: { quotationId: { in: documentIds } },
        select: {
          quotationId: true,
          technicalComparison: { select: { id: true, documentNo: true } },
        },
      });
      for (const item of items) {
        if (item.quotationId && !result.has(item.quotationId)) {
          result.set(
            item.quotationId,
            usage('TECHNICAL_COMPARISON', item.technicalComparison.id, item.technicalComparison.documentNo)
          );
        }
      }
      const comparisons = await prisma.technicalComparison.findMany({
        where: { quotationIds: { not: null } },
        select: { id: true, documentNo: true, quotationIds: true },
      });
      for (const comp of comparisons) {
        const ids = (comp.quotationIds || '').split(',').filter(Boolean);
        for (const qid of ids) {
          if (documentIds.includes(qid) && !result.has(qid)) {
            result.set(qid, usage('TECHNICAL_COMPARISON', comp.id, comp.documentNo));
          }
        }
      }
      break;
    }
    case 'TECHNICAL_COMPARISON': {
      const children = await prisma.supplierNomination.findMany({
        where: { technicalComparisonId: { in: documentIds } },
        select: { id: true, documentNo: true, technicalComparisonId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of children) {
        if (!result.has(child.technicalComparisonId)) {
          result.set(
            child.technicalComparisonId,
            usage('SUPPLIER_NOMINATION', child.id, child.documentNo)
          );
        }
      }
      break;
    }
    case 'SUPPLIER_NOMINATION': {
      const children = await prisma.purchaseOrder.findMany({
        where: { supplierNominationId: { in: documentIds } },
        select: { id: true, documentNo: true, supplierNominationId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of children) {
        if (child.supplierNominationId && !result.has(child.supplierNominationId)) {
          result.set(child.supplierNominationId, usage('PURCHASE_ORDER', child.id, child.documentNo));
        }
      }
      break;
    }
    case 'PURCHASE_ORDER': {
      const inspections = await prisma.purchaseOrderInspection.findMany({
        where: { purchaseOrderId: { in: documentIds } },
        select: { id: true, documentNo: true, purchaseOrderId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of inspections) {
        if (!result.has(child.purchaseOrderId)) {
          result.set(child.purchaseOrderId, usage('INSPECTION', child.id, child.documentNo));
        }
      }
      const receivings = await prisma.purchaseReceiving.findMany({
        where: { purchaseOrderId: { in: documentIds } },
        select: { id: true, documentNo: true, purchaseOrderId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of receivings) {
        if (!result.has(child.purchaseOrderId)) {
          result.set(child.purchaseOrderId, usage('RECEIVING', child.id, child.documentNo));
        }
      }
      const invoices = await prisma.purchaseInvoice.findMany({
        where: { purchaseOrderId: { in: documentIds } },
        select: { id: true, documentNo: true, purchaseOrderId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of invoices) {
        if (!result.has(child.purchaseOrderId)) {
          result.set(child.purchaseOrderId, usage('INVOICE', child.id, child.documentNo));
        }
      }
      break;
    }
    case 'INSPECTION': {
      const children = await prisma.purchaseReceiving.findMany({
        where: { inspectionId: { in: documentIds } },
        select: { id: true, documentNo: true, inspectionId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of children) {
        if (child.inspectionId && !result.has(child.inspectionId)) {
          result.set(child.inspectionId, usage('RECEIVING', child.id, child.documentNo));
        }
      }
      break;
    }
    case 'RECEIVING': {
      const children = await prisma.purchaseInvoice.findMany({
        where: { receivingId: { in: documentIds } },
        select: { id: true, documentNo: true, receivingId: true },
        orderBy: { createdAt: 'desc' },
      });
      for (const child of children) {
        if (child.receivingId && !result.has(child.receivingId)) {
          result.set(child.receivingId, usage('INVOICE', child.id, child.documentNo));
        }
      }
      break;
    }
  }

  return result;
}

export function getUsageLabel(childType?: string): string {
  if (!childType) return USAGE_LABEL;
  const docLabel = DOCUMENT_LABELS_AR[childType] || childType;
  return `تم التحويل إلى ${docLabel}`;
}
