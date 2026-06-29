import { prisma } from '@/lib/db';
import { DOCUMENT_STATUS } from '@/lib/constants';
import { isOracleMode } from '@/database/provider';
import { getDocumentUsage, type UsageDocumentType } from './used-document.service';

const NON_EDITABLE_STATUSES = [
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.PENDING_APPROVAL,
  DOCUMENT_STATUS.POSTED,
  DOCUMENT_STATUS.CLOSED,
  DOCUMENT_STATUS.CANCELLED,
  DOCUMENT_STATUS.REJECTED,
];

const LOCKED_STATUSES = [
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.POSTED,
  DOCUMENT_STATUS.CLOSED,
];

type GuardAction = 'edit' | 'delete' | 'cancel';

const STATUS_FIELD: Record<UsageDocumentType, string> = {
  PURCHASE_REQUEST: 'status',
  QUOTATION: 'status',
  TECHNICAL_COMPARISON: 'status',
  SUPPLIER_NOMINATION: 'status',
  PURCHASE_ORDER: 'status',
  INSPECTION: 'status',
  RECEIVING: 'receivingStatus',
};

const MODEL_MAP: Record<UsageDocumentType, keyof typeof prisma> = {
  PURCHASE_REQUEST: 'purchaseRequest',
  QUOTATION: 'quotation',
  TECHNICAL_COMPARISON: 'technicalComparison',
  SUPPLIER_NOMINATION: 'supplierNomination',
  PURCHASE_ORDER: 'purchaseOrder',
  INSPECTION: 'purchaseOrderInspection',
  RECEIVING: 'purchaseReceiving',
};

async function fetchDocumentStatus(documentType: UsageDocumentType, documentId: string) {
  const model = prisma[MODEL_MAP[documentType]] as unknown as {
    findUnique: (args: { where: { id: string }; select: Record<string, true> }) => Promise<Record<string, unknown> | null>;
  };
  const field = STATUS_FIELD[documentType];
  const doc = await model.findUnique({ where: { id: documentId }, select: { [field]: true } });
  return doc?.[field] as string | undefined;
}

export async function assertDocumentMutable(
  documentType: UsageDocumentType,
  documentId: string,
  action: GuardAction = 'edit'
) {
  if (isOracleMode()) {
    const { assertOracleDocumentMutable } = await import('@/database/document-guard.oracle');
    const ser = Number(documentId);
    if (Number.isNaN(ser)) throw new Error('معرّف المستند غير صالح');
    return assertOracleDocumentMutable(documentType, ser, action);
  }

  const status = await fetchDocumentStatus(documentType, documentId);
  if (!status) throw new Error('المستند غير موجود');

  if (action === 'delete' && status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف المستند إلا وهو في حالة مسودة');
  }

  if (action === 'edit' && NON_EDITABLE_STATUSES.includes(status as (typeof NON_EDITABLE_STATUSES)[number])) {
    throw new Error('لا يمكن تعديل المستند في حالته الحالية');
  }

  if (action === 'cancel' && LOCKED_STATUSES.includes(status as (typeof LOCKED_STATUSES)[number])) {
    throw new Error('لا يمكن إلغاء مستند معتمد أو مغلق');
  }

  const usage = await getDocumentUsage(documentType, documentId);
  if (usage.isUsed) {
    const msg =
      action === 'delete'
        ? 'لا يمكن حذف مستند مرتبط بوثيقة لاحقة'
        : action === 'cancel'
          ? 'لا يمكن إلغاء مستند مستخدم في سلسلة الشراء'
          : 'لا يمكن تعديل مستند مستخدم في سلسلة الشراء';
    throw new Error(msg);
  }
}

export function isStatusEditable(status: string): boolean {
  return ['Draft', 'Returned For Edit'].includes(status);
}

export function isStatusDeletable(status: string): boolean {
  return status === DOCUMENT_STATUS.DRAFT;
}
