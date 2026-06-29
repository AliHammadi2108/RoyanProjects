import type oracledb from 'oracledb';
import { ORACLE_DOC_DEFAULTS } from '@/database/oracle-defaults';
import { mapOracleFlagsToStatus } from '@/database/mappers/oracle-status.mapper';
import { nextDocumentNumber, nextSequenceValue } from '@/database/sequence.service';
import {
  executeDmlOnConn,
  executeOne,
  executeOneOnConn,
  executeQuery,
  executeQueryOnConn,
  q,
  withOracleTransaction,
  type PaginatedResult,
  type PaginationParams,
} from './base.repository';

export type OraclePurchaseRequestMasterRow = {
  PR_SER: number;
  PR_NO: number;
  PR_DATE: Date;
  PR_DESC: string | null;
  W_CODE: number | null;
  V_CODE: string | null;
  V_NAME: string | null;
  A_CY: string | null;
  REF_NO: string | null;
  REQ_AVL_DATE: Date | null;
  SIDE_REQ: string | null;
  APPROVED: number;
  PR_SELECTED: number;
  INACTIVE: number;
  PR_PARTIAL: number | null;
};

export type OraclePurchaseRequestDetailRow = {
  PR_SER: number;
  RCRD_NO: number;
  I_CODE: string;
  I_QTY: number;
  ITM_UNT: string;
  P_SIZE: number;
  P_QTY: number;
  W_CODE: number | null;
  ITEM_DESC: string | null;
  BARCODE: string | null;
};

export type PurchaseRequestLineDto = {
  recordNo: number;
  itemCode: string;
  quantity: number;
  unit: string;
  factorToBase: number;
  baseQty: number;
  warehouseCode: string | null;
  description: string | null;
  barcode: string | null;
};

export type PurchaseRequestDto = {
  ser: number;
  documentNo: string;
  date: Date;
  description: string | null;
  warehouseCode: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  currencyCode: string | null;
  referenceNo: string | null;
  requiredDate: Date | null;
  requesterUnit: string | null;
  status: string;
  lines: PurchaseRequestLineDto[];
};

export type SavePurchaseRequestInput = {
  description?: string | null;
  warehouseCode?: string | null;
  supplierCode?: string | null;
  supplierName?: string | null;
  currencyCode?: string | null;
  referenceNo?: string | null;
  requiredDate?: Date | null;
  requesterUnit?: string | null;
  date?: Date;
  lines: Array<{
    itemCode: string;
    quantity: number;
    unit: string;
    factorToBase: number;
    warehouseCode?: string | null;
    description?: string | null;
    barcode?: string | null;
  }>;
};

function mapMaster(row: OraclePurchaseRequestMasterRow, lines: PurchaseRequestLineDto[]): PurchaseRequestDto {
  return {
    ser: row.PR_SER,
    documentNo: String(row.PR_NO),
    date: row.PR_DATE,
    description: row.PR_DESC,
    warehouseCode: row.W_CODE != null ? String(row.W_CODE) : null,
    supplierCode: row.V_CODE,
    supplierName: row.V_NAME,
    currencyCode: row.A_CY,
    referenceNo: row.REF_NO,
    requiredDate: row.REQ_AVL_DATE,
    requesterUnit: row.SIDE_REQ,
    status: mapOracleFlagsToStatus(row, 'purchase_request'),
    lines,
  };
}

function mapDetail(row: OraclePurchaseRequestDetailRow): PurchaseRequestLineDto {
  return {
    recordNo: row.RCRD_NO,
    itemCode: row.I_CODE,
    quantity: row.I_QTY,
    unit: row.ITM_UNT,
    factorToBase: row.P_SIZE,
    baseQty: row.P_QTY,
    warehouseCode: row.W_CODE != null ? String(row.W_CODE) : null,
    description: row.ITEM_DESC,
    barcode: row.BARCODE,
  };
}

const SELECT_MST = `
  SELECT
    m.PR_SER, m.PR_NO, m.PR_DATE, m.PR_DESC, m.W_CODE, m.V_CODE, m.V_NAME, m.A_CY,
    m.REF_NO, m.REQ_AVL_DATE, m.SIDE_REQ, m.APPROVED, m.PR_SELECTED, m.INACTIVE, m.PR_PARTIAL
  FROM ${q('P_REQUEST')} m
`;

const SELECT_DTL = `
  SELECT d.PR_SER, d.RCRD_NO, d.I_CODE, d.I_QTY, d.ITM_UNT, d.P_SIZE, d.P_QTY,
         d.W_CODE, d.ITEM_DESC, d.BARCODE
  FROM ${q('P_REQUEST_DETAIL')} d
`;

export async function findPurchaseRequestBySer(prSer: number): Promise<PurchaseRequestDto | null> {
  const master = await executeOne<OraclePurchaseRequestMasterRow>(
    `${SELECT_MST} WHERE m.PR_SER = :prSer`,
    { prSer }
  );
  if (!master) return null;
  const details = await executeQuery<OraclePurchaseRequestDetailRow>(
    `${SELECT_DTL} WHERE d.PR_SER = :prSer ORDER BY d.RCRD_NO`,
    { prSer }
  );
  return mapMaster(master, details.map(mapDetail));
}

export async function listPurchaseRequests(
  params: PaginationParams & { status?: string; search?: string } = {}
): Promise<PaginatedResult<PurchaseRequestDto>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const binds: Record<string, string | number> = { offset, pageSize };

  if (params.search?.trim()) {
    conditions.push(`(
      TO_CHAR(m.PR_NO) LIKE :search
      OR UPPER(NVL(m.PR_DESC, '')) LIKE UPPER(:search)
      OR UPPER(NVL(m.V_CODE, '')) LIKE UPPER(:search)
    )`);
    binds.search = `%${params.search.trim()}%`;
  }

  const where = conditions.join(' AND ');
  const countRow = await executeOne<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM ${q('P_REQUEST')} m WHERE ${where}`,
    binds
  );
  const masters = await executeQuery<OraclePurchaseRequestMasterRow>(
    `${SELECT_MST} WHERE ${where} ORDER BY m.PR_DATE DESC, m.PR_SER DESC
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    binds
  );

  const rows = await Promise.all(
    masters.map(async (m) => {
      const details = await executeQuery<OraclePurchaseRequestDetailRow>(
        `${SELECT_DTL} WHERE d.PR_SER = :prSer ORDER BY d.RCRD_NO`,
        { prSer: m.PR_SER }
      );
      return mapMaster(m, details.map(mapDetail));
    })
  );

  const filtered =
    params.status != null && params.status !== ''
      ? rows.filter((r) => r.status === params.status)
      : rows;

  return { rows: filtered, total: countRow?.CNT ?? 0, page, pageSize };
}

async function insertPurchaseRequest(
  conn: oracledb.Connection,
  input: SavePurchaseRequestInput,
  prSer?: number
): Promise<PurchaseRequestDto> {
  const ser = prSer ?? (await nextSequenceValue('PR_SER', conn));
  const prNo = await nextDocumentNumber(conn, 'P_REQUEST', 'PR_NO');
  const prDate = input.date ?? new Date();
  const d = ORACLE_DOC_DEFAULTS;

  await executeDmlOnConn(
    conn,
    `INSERT INTO ${q('P_REQUEST')} (
      PR_TYPE, PR_NO, PR_SER, PR_DATE, W_CODE, PR_DESC, SIDE_REQ, REQ_AVL_DATE,
      V_CODE, V_NAME, A_CY, REF_NO, APPROVED, PR_SELECTED, INACTIVE, CMP_NO, BRN_NO, BRN_YEAR, BRN_USR
    ) VALUES (
      :prType, :prNo, :prSer, :prDate, :wCode, :prDesc, :sideReq, :reqAvlDate,
      :vCode, :vName, :aCy, :refNo, 0, 0, 0, :cmpNo, :brnNo, :brnYear, :brnUsr
    )`,
    {
      prType: d.PR_TYPE,
      prNo,
      prSer: ser,
      prDate,
      wCode: input.warehouseCode ? Number(input.warehouseCode) : null,
      prDesc: input.description ?? null,
      sideReq: input.requesterUnit ?? null,
      reqAvlDate: input.requiredDate ?? null,
      vCode: input.supplierCode ?? null,
      vName: input.supplierName ?? null,
      aCy: input.currencyCode ?? null,
      refNo: input.referenceNo ?? null,
      cmpNo: d.CMP_NO,
      brnNo: d.BRN_NO,
      brnYear: d.BRN_YEAR,
      brnUsr: d.BRN_USR,
    }
  );

  let rcrd = 1;
  for (const line of input.lines) {
    const baseQty = line.quantity * line.factorToBase;
    await executeDmlOnConn(
      conn,
      `INSERT INTO ${q('P_REQUEST_DETAIL')} (
        PR_TYPE, PR_NO, PR_SER, I_CODE, I_QTY, ITM_UNT, P_SIZE, P_QTY, W_CODE,
        RCRD_NO, ITEM_DESC, BARCODE, CMP_NO, BRN_NO, BRN_YEAR, BRN_USR
      ) VALUES (
        :prType, :prNo, :prSer, :iCode, :iQty, :itmUnt, :pSize, :pQty, :wCode,
        :rcrdNo, :itemDesc, :barcode, :cmpNo, :brnNo, :brnYear, :brnUsr
      )`,
      {
        prType: d.PR_TYPE,
        prNo,
        prSer: ser,
        iCode: line.itemCode,
        iQty: line.quantity,
        itmUnt: line.unit,
        pSize: line.factorToBase,
        pQty: baseQty,
        wCode: line.warehouseCode ? Number(line.warehouseCode) : input.warehouseCode ? Number(input.warehouseCode) : null,
        rcrdNo: rcrd++,
        itemDesc: line.description ?? null,
        barcode: line.barcode ?? null,
        cmpNo: d.CMP_NO,
        brnNo: d.BRN_NO,
        brnYear: d.BRN_YEAR,
        brnUsr: d.BRN_USR,
      }
    );
  }

  const saved = await executeOneOnConn<OraclePurchaseRequestMasterRow>(
    conn,
    `${SELECT_MST} WHERE m.PR_SER = :prSer`,
    { prSer: ser }
  );
  const details = await executeQueryOnConn<OraclePurchaseRequestDetailRow>(
    conn,
    `${SELECT_DTL} WHERE d.PR_SER = :prSer ORDER BY d.RCRD_NO`,
    { prSer: ser }
  );
  return mapMaster(saved!, details.map(mapDetail));
}

export async function createPurchaseRequest(
  input: SavePurchaseRequestInput
): Promise<PurchaseRequestDto> {
  return withOracleTransaction((conn) => insertPurchaseRequest(conn, input));
}

export async function updatePurchaseRequest(
  prSer: number,
  input: SavePurchaseRequestInput
): Promise<PurchaseRequestDto> {
  return withOracleTransaction(async (conn) => {
    const existing = await executeOneOnConn<OraclePurchaseRequestMasterRow>(
      conn,
      `${SELECT_MST} WHERE m.PR_SER = :prSer`,
      { prSer }
    );
    if (!existing) throw new Error('طلب الشراء غير موجود');

    await executeDmlOnConn(
      conn,
      `UPDATE ${q('P_REQUEST')} SET
        PR_DESC = :prDesc, W_CODE = :wCode, SIDE_REQ = :sideReq, REQ_AVL_DATE = :reqAvlDate,
        V_CODE = :vCode, V_NAME = :vName, A_CY = :aCy, REF_NO = :refNo
       WHERE PR_SER = :prSer`,
      {
        prSer,
        prDesc: input.description ?? null,
        wCode: input.warehouseCode ? Number(input.warehouseCode) : null,
        sideReq: input.requesterUnit ?? null,
        reqAvlDate: input.requiredDate ?? null,
        vCode: input.supplierCode ?? null,
        vName: input.supplierName ?? null,
        aCy: input.currencyCode ?? null,
        refNo: input.referenceNo ?? null,
      }
    );

    await executeDmlOnConn(conn, `DELETE FROM ${q('P_REQUEST_DETAIL')} WHERE PR_SER = :prSer`, { prSer });

    const d = ORACLE_DOC_DEFAULTS;
    let rcrd = 1;
    for (const line of input.lines) {
      const baseQty = line.quantity * line.factorToBase;
      await executeDmlOnConn(
        conn,
        `INSERT INTO ${q('P_REQUEST_DETAIL')} (
          PR_TYPE, PR_NO, PR_SER, I_CODE, I_QTY, ITM_UNT, P_SIZE, P_QTY, W_CODE,
          RCRD_NO, ITEM_DESC, BARCODE, CMP_NO, BRN_NO, BRN_YEAR, BRN_USR
        ) VALUES (
          :prType, :prNo, :prSer, :iCode, :iQty, :itmUnt, :pSize, :pQty, :wCode,
          :rcrdNo, :itemDesc, :barcode, :cmpNo, :brnNo, :brnYear, :brnUsr
        )`,
        {
          prType: d.PR_TYPE,
          prNo: existing.PR_NO,
          prSer,
          iCode: line.itemCode,
          iQty: line.quantity,
          itmUnt: line.unit,
          pSize: line.factorToBase,
          pQty: baseQty,
          wCode: line.warehouseCode ? Number(line.warehouseCode) : input.warehouseCode ? Number(input.warehouseCode) : null,
          rcrdNo: rcrd++,
          itemDesc: line.description ?? null,
          barcode: line.barcode ?? null,
          cmpNo: d.CMP_NO,
          brnNo: d.BRN_NO,
          brnYear: d.BRN_YEAR,
          brnUsr: d.BRN_USR,
        }
      );
    }

    const saved = await executeOneOnConn<OraclePurchaseRequestMasterRow>(
      conn,
      `${SELECT_MST} WHERE m.PR_SER = :prSer`,
      { prSer }
    );
    const details = await executeQueryOnConn<OraclePurchaseRequestDetailRow>(
      conn,
      `${SELECT_DTL} WHERE d.PR_SER = :prSer ORDER BY d.RCRD_NO`,
      { prSer }
    );
    return mapMaster(saved!, details.map(mapDetail));
  });
}

export async function deletePurchaseRequest(prSer: number): Promise<void> {
  await withOracleTransaction(async (conn) => {
    await executeDmlOnConn(conn, `DELETE FROM ${q('P_REQUEST_DETAIL')} WHERE PR_SER = :prSer`, { prSer });
    await executeDmlOnConn(conn, `DELETE FROM ${q('P_REQUEST')} WHERE PR_SER = :prSer`, { prSer });
  });
}
