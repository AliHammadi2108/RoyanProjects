import { describe, it, expect } from 'vitest';
import {
  isOpenStandardDocument,
  isOpenInspection,
  isOpenReceiving,
  isClosedDocumentStatus,
  parseListFilter,
  openFilterHref,
  CLOSED_DOCUMENT_STATUSES,
} from '@/lib/purchase-open-filter';
import { DOCUMENT_STATUS } from '@/lib/constants';
import { getScreenPermissionForPath } from '@/lib/screen-access';

describe('purchase-open-filter', () => {
  it('identifies closed document statuses', () => {
    expect(isClosedDocumentStatus(DOCUMENT_STATUS.CANCELLED)).toBe(true);
    expect(isClosedDocumentStatus(DOCUMENT_STATUS.POSTED)).toBe(true);
    expect(isClosedDocumentStatus(DOCUMENT_STATUS.DRAFT)).toBe(false);
    expect(isClosedDocumentStatus(DOCUMENT_STATUS.PENDING_APPROVAL)).toBe(false);
    expect(isClosedDocumentStatus(DOCUMENT_STATUS.APPROVED)).toBe(false);
  });

  it('open standard document excludes closed and used', () => {
    expect(isOpenStandardDocument('Draft')).toBe(true);
    expect(isOpenStandardDocument('Pending Approval')).toBe(true);
    expect(isOpenStandardDocument('Approved')).toBe(true);
    expect(isOpenStandardDocument('Approved', { isUsed: true })).toBe(false);
    expect(isOpenStandardDocument('Cancelled')).toBe(false);
    expect(isOpenStandardDocument('Posted')).toBe(false);
  });

  it('open inspection rules', () => {
    expect(isOpenInspection('Pending')).toBe(true);
    expect(isOpenInspection('Partially Accepted')).toBe(true);
    expect(isOpenInspection('Rejected')).toBe(false);
    expect(isOpenInspection('Pending', { isUsed: true })).toBe(false);
  });

  it('open receiving rules', () => {
    expect(isOpenReceiving('Not Received')).toBe(true);
    expect(isOpenReceiving('Partially Received')).toBe(true);
    expect(isOpenReceiving('Fully Received')).toBe(false);
    expect(isOpenReceiving('Partially Received', { isUsed: true })).toBe(false);
  });

  it('parses list filter param', () => {
    expect(parseListFilter('open')).toBe('open');
    expect(parseListFilter('closed')).toBe('');
    expect(parseListFilter(undefined)).toBe('');
  });

  it('builds open filter href', () => {
    expect(openFilterHref('/purchases/requests')).toBe('/purchases/requests?filter=open');
  });

  it('closed statuses list is stable', () => {
    expect(CLOSED_DOCUMENT_STATUSES).toContain(DOCUMENT_STATUS.FULLY_RECEIVED);
  });
});

describe('purchase dashboard screen access', () => {
  it('maps dashboard to tracking.view permission', () => {
    expect(getScreenPermissionForPath('/purchases/dashboard')).toBe('tracking.view');
  });
});
