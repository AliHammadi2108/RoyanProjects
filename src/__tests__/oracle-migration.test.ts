import { describe, it, expect } from 'vitest';
import { DOCUMENT_STATUS } from '@/lib/constants';
import {
  canDeleteDocument,
  canEditDocument,
  isDocumentLocked,
} from '@/database/document-guard.oracle';
import {
  isOracleRowEditable,
  isOracleRowLocked,
  mapOracleFlagsToStatus,
} from '@/database/mappers/oracle-status.mapper';
import { mapCurrencyRow } from '@/database/repositories/currency.repository';
import { mapItemRow, mapItemUnitRow } from '@/database/repositories/item.repository';
import { mapSupplierRow } from '@/database/repositories/supplier.repository';
import { mapDocumentListRow } from '@/database/repositories/purchase-cycle.shared';

describe('oracle-status.mapper', () => {
  it('maps draft purchase request when no lock flags', () => {
    expect(mapOracleFlagsToStatus({}, 'purchase_request')).toBe(DOCUMENT_STATUS.DRAFT);
  });

  it('maps approved purchase request', () => {
    expect(mapOracleFlagsToStatus({ APPROVED: 1 }, 'purchase_request')).toBe(
      DOCUMENT_STATUS.APPROVED
    );
  });

  it('maps processed purchase request via PR_SELECTED', () => {
    expect(
      mapOracleFlagsToStatus({ APPROVED: 1, PR_SELECTED: 1 }, 'purchase_request')
    ).toBe(DOCUMENT_STATUS.POSTED);
  });

  it('maps posted purchase invoice via BILL_POST', () => {
    expect(mapOracleFlagsToStatus({ BILL_POST: 1 }, 'purchase_invoice')).toBe(
      DOCUMENT_STATUS.POSTED
    );
  });

  it('detects locked rows', () => {
    expect(isOracleRowLocked({ PO_LOCKED: 1 })).toBe(true);
    expect(isOracleRowEditable({ APPROVED: 0, PR_SELECTED: 0 })).toBe(true);
  });
});

describe('document-guard.oracle', () => {
  const draftPr = { APPROVED: 0, PR_SELECTED: 0, INACTIVE: 0 };

  it('allows edit on draft PR', () => {
    expect(canEditDocument(draftPr, 'PURCHASE_REQUEST')).toBe(true);
  });

  it('blocks edit on approved PR', () => {
    expect(canEditDocument({ APPROVED: 1 }, 'PURCHASE_REQUEST')).toBe(false);
  });

  it('allows delete only on draft', () => {
    expect(canDeleteDocument(draftPr, 'PURCHASE_REQUEST')).toBe(true);
    expect(canDeleteDocument({ APPROVED: 1 }, 'PURCHASE_REQUEST')).toBe(false);
  });

  it('reports locked PO', () => {
    expect(isDocumentLocked({ PO_LOCKED: 1, APPROVED: 1 })).toBe(true);
  });
});

describe('repository mappers', () => {
  it('maps supplier row', () => {
    const dto = mapSupplierRow({
      V_CODE: 'V001',
      V_A_CODE: '4001',
      V_A_NAME: 'مورد',
      V_E_NAME: null,
      V_PHONE: null,
      V_MOBILE: null,
      V_E_MAIL: null,
      V_ADDRESS: null,
      V_TAX_CODE: null,
      CR_NO: null,
      V_NOTE: null,
      INACTIVE: 0,
      INACTIVE_PUR: 0,
      BLK_LST: 0,
      CREDIT_PERIOD: 30,
      WHATSAPP_GRP: null,
      SEND_MSG: 0,
      V_SINCE: null,
    });
    expect(dto.code).toBe('V001');
    expect(dto.isActive).toBe(true);
    expect(dto.creditPeriod).toBe(30);
  });

  it('maps currency row', () => {
    const dto = mapCurrencyRow({
      CUR_CODE: 'USD',
      CUR_A_NAME: 'دولار',
      CUR_E_NAME: 'US Dollar',
      CUR_RATE: 530,
      INACTIVE: 0,
    });
    expect(dto.code).toBe('USD');
    expect(dto.rate).toBe(530);
  });

  it('maps item with units', () => {
    const unit = mapItemUnitRow({
      I_CODE: 'ITM1',
      ITM_UNT: 'BOX',
      P_SIZE: 12,
      MAIN_UNIT: 0,
      PUR_UNIT: 1,
      SALE_UNIT: 0,
      STOCK_UNIT: 1,
      BARCODE: '123',
      INACTIVE: 0,
    });
    const item = mapItemRow(
      {
        I_CODE: 'ITM1',
        I_NAME: 'صنف',
        I_E_NAME: null,
        G_CODE: 'G1',
        I_DESC: null,
        ALTER_CODE: 'BC1',
        BLOCKED: 0,
        INACTIVE: 0,
        SERVICE_ITM: 0,
        VAT_PER: 15,
      },
      [unit]
    );
    expect(item.units[0].factorToBase).toBe(12);
    expect(item.vatPct).toBe(15);
  });

  it('maps purchase order list row', () => {
    const row = mapDocumentListRow(
      {
        SER: 10,
        DOC_NO: 1001,
        DOC_DATE: new Date('2026-01-01'),
        V_CODE: 'V1',
        V_NAME: 'مورد',
        CUR_CODE: 'YER',
        DOC_DSC: 'أمر',
        APPROVED: 0,
        PO_PROCESSED: 0,
        PO_CLOSED: 0,
        PO_LOCKED: 0,
        INACTIVE: 0,
      },
      'purchase_order'
    );
    expect(row.documentNo).toBe('1001');
    expect(row.status).toBe(DOCUMENT_STATUS.DRAFT);
  });
});
