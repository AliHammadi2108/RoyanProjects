import type { UsageDocumentType } from '@/services/used-document.service';
import { DOCUMENT_STATUS } from '@/lib/constants';
import { getScreenMap, type ScreenKey } from '@/database/oracleSchemaMap';
import {
  isOracleRowEditable,
  isOracleRowLocked,
  mapOracleFlagsToStatus,
  type OracleLockRow,
} from '@/database/mappers/oracle-status.mapper';
import { executeOne, q } from '@/database/repositories/base.repository';
import { isDocumentUsedOracle } from '@/database/document-usage.oracle';

const SCREEN_BY_USAGE: Record<UsageDocumentType, ScreenKey> = {
  PURCHASE_REQUEST: 'purchase_request',
  QUOTATION: 'quotation',
  TECHNICAL_COMPARISON: 'technical_comparison',
  SUPPLIER_NOMINATION: 'supplier_nomination',
  PURCHASE_ORDER: 'purchase_order',
  INSPECTION: 'inspection',
  RECEIVING: 'receiving',
};

const STATUS_KIND: Record<UsageDocumentType, Parameters<typeof mapOracleFlagsToStatus>[1]> = {
  PURCHASE_REQUEST: 'purchase_request',
  QUOTATION: 'quotation',
  TECHNICAL_COMPARISON: 'comparison',
  SUPPLIER_NOMINATION: 'nomination',
  PURCHASE_ORDER: 'purchase_order',
  INSPECTION: 'inspection',
  RECEIVING: 'receiving',
};

type GuardAction = 'edit' | 'delete' | 'cancel';

const NON_EDITABLE = [
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.PENDING_APPROVAL,
  DOCUMENT_STATUS.POSTED,
  DOCUMENT_STATUS.CLOSED,
  DOCUMENT_STATUS.CANCELLED,
  DOCUMENT_STATUS.REJECTED,
];

const LOCKED = [DOCUMENT_STATUS.APPROVED, DOCUMENT_STATUS.POSTED, DOCUMENT_STATUS.CLOSED];

export function canEditDocument(row: OracleLockRow, documentType: UsageDocumentType): boolean {
  if (!isOracleRowEditable(row)) return false;
  const status = mapOracleFlagsToStatus(row, STATUS_KIND[documentType]);
  return !NON_EDITABLE.includes(status as (typeof NON_EDITABLE)[number]);
}

export function canDeleteDocument(row: OracleLockRow, documentType: UsageDocumentType): boolean {
  const status = mapOracleFlagsToStatus(row, STATUS_KIND[documentType]);
  if (status !== DOCUMENT_STATUS.DRAFT) return false;
  return isOracleRowEditable(row);
}

export function isDocumentLocked(row: OracleLockRow): boolean {
  return isOracleRowLocked(row);
}

async function fetchLockRow(
  documentType: UsageDocumentType,
  ser: number
): Promise<OracleLockRow | null> {
  const screen = getScreenMap(SCREEN_BY_USAGE[documentType]);
  const lockCols = screen.lockFields.filter((f) => f !== 'INACTIVE_PUR' && f !== 'BLK_LST');
  const selectCols = Array.from(new Set(lockCols)).map((c) => `m.${c}`).join(', ');

  return executeOne<OracleLockRow>(
    `SELECT ${selectCols} FROM ${q(screen.masterTable)} m WHERE m.${screen.pkMaster} = :ser`,
    { ser }
  );
}

export async function assertOracleDocumentMutable(
  documentType: UsageDocumentType,
  documentSer: number,
  action: GuardAction = 'edit'
): Promise<void> {
  const row = await fetchLockRow(documentType, documentSer);
  if (!row) throw new Error('المستند غير موجود');

  const status = mapOracleFlagsToStatus(row, STATUS_KIND[documentType]);

  if (action === 'delete' && status !== DOCUMENT_STATUS.DRAFT) {
    throw new Error('لا يمكن حذف المستند إلا وهو في حالة مسودة');
  }

  if (action === 'edit' && NON_EDITABLE.includes(status as (typeof NON_EDITABLE)[number])) {
    throw new Error('لا يمكن تعديل المستند في حالته الحالية');
  }

  if (action === 'cancel' && LOCKED.includes(status as (typeof LOCKED)[number])) {
    throw new Error('لا يمكن إلغاء مستند معتمد أو مغلق');
  }

  const used = await isDocumentUsedOracle(documentType, documentSer);
  if (used.isUsed) {
    const msg =
      action === 'delete'
        ? 'لا يمكن حذف مستند مرتبط بوثيقة لاحقة'
        : action === 'cancel'
          ? 'لا يمكن إلغاء مستند مستخدم في سلسلة الشراء'
          : 'لا يمكن تعديل مستند مستخدم في سلسلة الشراء';
    throw new Error(msg);
  }
}
