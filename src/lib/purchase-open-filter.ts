import { DOCUMENT_STATUS } from '@/lib/constants';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';

/** Terminal statuses — document is no longer active at this stage */
export const CLOSED_DOCUMENT_STATUSES: readonly string[] = [
  DOCUMENT_STATUS.CANCELLED,
  DOCUMENT_STATUS.REJECTED,
  DOCUMENT_STATUS.CLOSED,
  DOCUMENT_STATUS.POSTED,
  DOCUMENT_STATUS.EXPIRED,
  DOCUMENT_STATUS.FULLY_RECEIVED,
];

export const OPEN_FILTER_PARAM = 'open';

export type PurchaseListFilter = '' | typeof OPEN_FILTER_PARAM;

export function isClosedDocumentStatus(status: string): boolean {
  return CLOSED_DOCUMENT_STATUSES.includes(status);
}

/** Standard workflow documents (request → order, invoice) */
export function isOpenStandardDocument(
  status: string,
  usage?: UsedDocumentInfo | null
): boolean {
  if (isClosedDocumentStatus(status)) return false;
  if (usage?.isUsed) return false;
  return true;
}

export function isOpenInspection(
  inspectionResult: string,
  usage?: UsedDocumentInfo | null
): boolean {
  if (inspectionResult === 'Rejected') return false;
  if (usage?.isUsed) return false;
  return inspectionResult === 'Pending' || inspectionResult === 'Partially Accepted';
}

export function isOpenReceiving(
  receivingStatus: string,
  usage?: UsedDocumentInfo | null
): boolean {
  if (receivingStatus === DOCUMENT_STATUS.FULLY_RECEIVED) return false;
  if (usage?.isUsed) return false;
  return true;
}

export function parseListFilter(value?: string | null): PurchaseListFilter {
  return value === OPEN_FILTER_PARAM ? OPEN_FILTER_PARAM : '';
}

export function openFilterHref(basePath: string): string {
  return `${basePath}?filter=${OPEN_FILTER_PARAM}`;
}
