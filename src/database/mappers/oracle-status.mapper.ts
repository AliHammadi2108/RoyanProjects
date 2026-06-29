import { DOCUMENT_STATUS } from '@/lib/constants';

export type OracleLockRow = {
  APPROVED?: number | null;
  PROCESSED?: number | null;
  PO_PROCESSED?: number | null;
  PO_CLOSED?: number | null;
  PO_LOCKED?: number | null;
  PO_PARTIAL?: number | null;
  PR_SELECTED?: number | null;
  PR_PARTIAL?: number | null;
  INACTIVE?: number | null;
  BILL_POST?: number | null;
  PRCSSD_FLG?: number | null;
  HUNG?: number | null;
  CHECK_STATUS?: number | null;
};

function flag(value: number | null | undefined): boolean {
  return value === 1;
}

/** Map Oracle lock flags to application document status string. */
export function mapOracleFlagsToStatus(
  row: OracleLockRow,
  kind:
    | 'purchase_request'
    | 'quotation'
    | 'comparison'
    | 'nomination'
    | 'purchase_order'
    | 'inspection'
    | 'receiving'
    | 'purchase_invoice' = 'purchase_request'
): string {
  if (flag(row.INACTIVE)) return DOCUMENT_STATUS.CANCELLED;

  if (kind === 'purchase_invoice') {
    if (flag(row.BILL_POST)) return DOCUMENT_STATUS.POSTED;
    if (flag(row.HUNG)) return DOCUMENT_STATUS.CANCELLED;
    if (flag(row.APPROVED)) return DOCUMENT_STATUS.APPROVED;
    return DOCUMENT_STATUS.DRAFT;
  }

  if (kind === 'purchase_order') {
    if (flag(row.PO_CLOSED)) return DOCUMENT_STATUS.CLOSED;
    if (flag(row.PO_LOCKED) || flag(row.PO_PROCESSED)) return DOCUMENT_STATUS.POSTED;
    if (flag(row.APPROVED)) return DOCUMENT_STATUS.APPROVED;
    return DOCUMENT_STATUS.DRAFT;
  }

  if (kind === 'purchase_request') {
    if (flag(row.PR_SELECTED)) return DOCUMENT_STATUS.POSTED;
    if (flag(row.APPROVED)) return DOCUMENT_STATUS.APPROVED;
    return DOCUMENT_STATUS.DRAFT;
  }

  if (kind === 'quotation' || kind === 'inspection' || kind === 'receiving') {
    if (flag(row.PROCESSED)) return DOCUMENT_STATUS.POSTED;
    if (flag(row.APPROVED)) return DOCUMENT_STATUS.APPROVED;
    return DOCUMENT_STATUS.DRAFT;
  }

  if (kind === 'comparison' || kind === 'nomination') {
    if (flag(row.PRCSSD_FLG)) return DOCUMENT_STATUS.POSTED;
    if (flag(row.APPROVED)) return DOCUMENT_STATUS.APPROVED;
    return DOCUMENT_STATUS.DRAFT;
  }

  if (flag(row.APPROVED)) return DOCUMENT_STATUS.APPROVED;
  return DOCUMENT_STATUS.DRAFT;
}

export function isOracleRowLocked(row: OracleLockRow): boolean {
  return (
    flag(row.APPROVED) ||
    flag(row.PROCESSED) ||
    flag(row.PO_PROCESSED) ||
    flag(row.PO_CLOSED) ||
    flag(row.PO_LOCKED) ||
    flag(row.PR_SELECTED) ||
    flag(row.INACTIVE) ||
    flag(row.BILL_POST) ||
    flag(row.PRCSSD_FLG)
  );
}

export function isOracleRowEditable(row: OracleLockRow): boolean {
  return !isOracleRowLocked(row);
}
