import { prisma } from '@/lib/db';
import { DOCUMENT_STATUS } from '@/lib/constants';
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
  const status = await fetchDocumentStatus(documentType, documentId);
  if (!status) throw new Error('ط§ظ„ظ…ط³طھظ†ط¯ ط؛ظٹط± ظ…ظˆط¬ظˆط¯');

  if (action === 'delete' && status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ط§ظ„ظ…ط³طھظ†ط¯ ط¥ظ„ط§ ظˆظ‡ظˆ ظپظٹ ط­ط§ظ„ط© ظ…ط³ظˆط¯ط©');
  }

  if (action === 'edit' && NON_EDITABLE_STATUSES.includes(status as (typeof NON_EDITABLE_STATUSES)[number])) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط³طھظ†ط¯ ظپظٹ ط­ط§ظ„طھظ‡ ط§ظ„ط­ط§ظ„ظٹط©');
  }

  if (action === 'cancel' && LOCKED_STATUSES.includes(status as (typeof LOCKED_STATUSES)[number])) {
    throw new Error('ظ„ط§ ظٹظ…ظƒظ† ط¥ظ„ط؛ط§ط، ظ…ط³طھظ†ط¯ ظ…ط¹طھظ…ط¯ ط£ظˆ ظ…ط؛ظ„ظ‚');
  }

  const usage = await getDocumentUsage(documentType, documentId);
  if (usage.isUsed) {
    const msg =
      action === 'delete'
        ? 'ظ„ط§ ظٹظ…ظƒظ† ط­ط°ظپ ظ…ط³طھظ†ط¯ ظ…ط±طھط¨ط· ط¨ظˆط«ظٹظ‚ط© ظ„ط§ط­ظ‚ط©'
        : action === 'cancel'
          ? 'ظ„ط§ ظٹظ…ظƒظ† ط¥ظ„ط؛ط§ط، ظ…ط³طھظ†ط¯ ظ…ط³طھط®ط¯ظ… ظپظٹ ط³ظ„ط³ظ„ط© ط§ظ„ط´ط±ط§ط،'
          : 'ظ„ط§ ظٹظ…ظƒظ† طھط¹ط¯ظٹظ„ ظ…ط³طھظ†ط¯ ظ…ط³طھط®ط¯ظ… ظپظٹ ط³ظ„ط³ظ„ط© ط§ظ„ط´ط±ط§ط،';
    throw new Error(msg);
  }
}

export function isStatusEditable(status: string): boolean {
  return ['Draft', 'Returned For Edit'].includes(status);
}

export function isStatusDeletable(status: string): boolean {
  return status === DOCUMENT_STATUS.DRAFT;
}
