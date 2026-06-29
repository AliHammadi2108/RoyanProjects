/**
 * Shared read helpers for Oracle purchase-cycle master/detail documents.
 */
import { mapOracleFlagsToStatus } from '@/database/mappers/oracle-status.mapper';
import { executeOne, executeQuery, q, type PaginatedResult, type PaginationParams } from './base.repository';

export type DocumentListRow = {
  ser: number;
  documentNo: string;
  date: Date;
  status: string;
  supplierCode: string | null;
  supplierName: string | null;
  currencyCode: string | null;
  description: string | null;
};

type DocTableConfig = {
  masterTable: string;
  detailTable?: string;
  serColumn: string;
  noColumn: string;
  dateColumn: string;
  supplierColumn?: string;
  supplierNameColumn?: string;
  currencyColumn?: string;
  descColumn?: string;
  statusKind: Parameters<typeof mapOracleFlagsToStatus>[1];
  lockColumns: string[];
};

const CONFIGS = {
  quotation: {
    masterTable: 'IAS_VND_QUOT_MST',
    detailTable: 'IAS_VND_QUOT_DTL',
    serColumn: 'QT_SER',
    noColumn: 'QT_NO',
    dateColumn: 'QT_DATE',
    supplierColumn: 'V_CODE',
    supplierNameColumn: 'V_NAME',
    currencyColumn: 'A_CY',
    descColumn: 'A_DESC',
    statusKind: 'quotation',
    lockColumns: ['APPROVED', 'PROCESSED', 'INACTIVE'],
  },
  comparison: {
    masterTable: 'IAS_APS_QTN_CMPR_MST',
    detailTable: 'IAS_APS_QTN_CMPR_DTL',
    serColumn: 'DOC_SER',
    noColumn: 'DOC_NO',
    dateColumn: 'DOC_DATE',
    currencyColumn: 'CUR_CODE',
    descColumn: 'DOC_DSC',
    statusKind: 'comparison',
    lockColumns: ['APPROVED', 'PRCSSD_FLG', 'INACTIVE'],
  },
  nomination: {
    masterTable: 'IAS_APS_QTN_CMPR_FLTR_MST',
    detailTable: 'IAS_APS_QTN_CMPR_FLTR_DTL',
    serColumn: 'DOC_SER',
    noColumn: 'DOC_NO',
    dateColumn: 'DOC_DATE',
    currencyColumn: 'CUR_CODE',
    descColumn: 'DOC_DSC',
    statusKind: 'nomination',
    lockColumns: ['APPROVED', 'PRCSSD_FLG', 'INACTIVE'],
  },
  purchase_order: {
    masterTable: 'P_ORDER',
    detailTable: 'P_ORDER_DETAIL',
    serColumn: 'PO_SER',
    noColumn: 'PO_NO',
    dateColumn: 'PO_DATE',
    supplierColumn: 'V_CODE',
    supplierNameColumn: 'V_NAME',
    currencyColumn: 'CUR_CODE',
    descColumn: 'PO_DESC',
    statusKind: 'purchase_order',
    lockColumns: ['APPROVED', 'PO_PROCESSED', 'PO_CLOSED', 'PO_LOCKED', 'INACTIVE'],
  },
  inspection: {
    masterTable: 'IAS_CHECK_INCM_MST',
    detailTable: 'IAS_CHECK_INCM_DTL',
    serColumn: 'DOC_SER',
    noColumn: 'DOC_NO',
    dateColumn: 'DOC_DATE',
    supplierColumn: 'V_CODE',
    supplierNameColumn: 'V_NAME',
    descColumn: 'DOC_DESC',
    statusKind: 'inspection',
    lockColumns: ['APPROVED', 'PROCESSED'],
  },
  receiving: {
    masterTable: 'GRN_MASTER',
    detailTable: 'GRN_DETAIL',
    serColumn: 'G_SER',
    noColumn: 'GR_NO',
    dateColumn: 'GR_DATE',
    supplierColumn: 'V_CODE',
    currencyColumn: 'A_CY',
    descColumn: 'A_DESC',
    statusKind: 'receiving',
    lockColumns: ['APPROVED', 'PROCESSED'],
  },
  purchase_invoice: {
    masterTable: 'IAS_PI_BILL_MST',
    detailTable: 'IAS_PI_BILL_DTL',
    serColumn: 'BILL_SER',
    noColumn: 'BILL_NO',
    dateColumn: 'BILL_DATE',
    supplierColumn: 'V_CODE',
    supplierNameColumn: 'V_NAME',
    currencyColumn: 'BILL_CURRENCY',
    statusKind: 'purchase_invoice',
    lockColumns: ['BILL_POST', 'HUNG', 'APPROVED'],
  },
} as const satisfies Record<string, DocTableConfig>;

export type PurchaseCycleDocKind = keyof typeof CONFIGS;

function buildSelect(cfg: DocTableConfig): string {
  const cols = [
    `m.${cfg.serColumn} AS SER`,
    `m.${cfg.noColumn} AS DOC_NO`,
    `m.${cfg.dateColumn} AS DOC_DATE`,
    ...cfg.lockColumns.map((c) => `m.${c}`),
  ];
  if (cfg.supplierColumn) cols.push(`m.${cfg.supplierColumn} AS V_CODE`);
  if (cfg.supplierNameColumn) cols.push(`m.${cfg.supplierNameColumn} AS V_NAME`);
  if (cfg.currencyColumn) cols.push(`m.${cfg.currencyColumn} AS CUR_CODE`);
  if (cfg.descColumn) cols.push(`m.${cfg.descColumn} AS DOC_DSC`);
  return `SELECT ${cols.join(', ')} FROM ${q(cfg.masterTable)} m`;
}

type RawDocRow = {
  SER: number;
  DOC_NO: number;
  DOC_DATE: Date;
  V_CODE?: string | null;
  V_NAME?: string | null;
  CUR_CODE?: string | null;
  DOC_DSC?: string | null;
  APPROVED?: number;
  PROCESSED?: number;
  PO_PROCESSED?: number;
  PO_CLOSED?: number;
  PO_LOCKED?: number;
  INACTIVE?: number;
  BILL_POST?: number;
  HUNG?: number;
  PRCSSD_FLG?: number;
};

export function mapDocumentListRow(row: RawDocRow, kind: PurchaseCycleDocKind): DocumentListRow {
  const cfg = CONFIGS[kind];
  return {
    ser: row.SER,
    documentNo: String(row.DOC_NO),
    date: row.DOC_DATE,
    status: mapOracleFlagsToStatus(row, cfg.statusKind),
    supplierCode: row.V_CODE ?? null,
    supplierName: row.V_NAME ?? null,
    currencyCode: row.CUR_CODE ?? null,
    description: row.DOC_DSC ?? null,
  };
}

export async function listPurchaseCycleDocuments(
  kind: PurchaseCycleDocKind,
  params: PaginationParams = {}
): Promise<PaginatedResult<DocumentListRow>> {
  const cfg = CONFIGS[kind];
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const binds: Record<string, string | number> = { offset, pageSize };

  if (params.search?.trim()) {
    const descCol = 'descColumn' in cfg && cfg.descColumn ? cfg.descColumn : cfg.noColumn;
    conditions.push(`(
      TO_CHAR(m.${cfg.noColumn}) LIKE :search
      OR UPPER(NVL(m.${descCol}, '')) LIKE UPPER(:search)
    )`);
    binds.search = `%${params.search.trim()}%`;
  }

  const where = conditions.join(' AND ');
  const countRow = await executeOne<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM ${q(cfg.masterTable)} m WHERE ${where}`,
    binds
  );
  const rows = await executeQuery<RawDocRow>(
    `${buildSelect(cfg)} WHERE ${where}
     ORDER BY m.${cfg.dateColumn} DESC, m.${cfg.serColumn} DESC
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    binds
  );

  return {
    rows: rows.map((r) => mapDocumentListRow(r, kind)),
    total: countRow?.CNT ?? 0,
    page,
    pageSize,
  };
}

export async function findPurchaseCycleDocumentBySer(
  kind: PurchaseCycleDocKind,
  ser: number
): Promise<DocumentListRow | null> {
  const cfg = CONFIGS[kind];
  const row = await executeOne<RawDocRow>(
    `${buildSelect(cfg)} WHERE m.${cfg.serColumn} = :ser`,
    { ser }
  );
  return row ? mapDocumentListRow(row, kind) : null;
}

export { CONFIGS as PURCHASE_CYCLE_TABLE_CONFIG };
