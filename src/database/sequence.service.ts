import type oracledb from 'oracledb';
import { q } from '@/database/oracle';
import { executeOne, executeQueryOnConn } from './repositories/base.repository';

export type SequenceName = 'PR_SER' | 'PO_SER' | 'QT_SER' | 'DOC_SER' | 'G_SER' | 'BILL_SER';

const SEQ_MAP: Record<SequenceName, { sequence: string; table: string; column: string }> = {
  PR_SER: { sequence: 'PWS_PR_SER_SEQ', table: 'P_REQUEST', column: 'PR_SER' },
  PO_SER: { sequence: 'PWS_PO_SER_SEQ', table: 'P_ORDER', column: 'PO_SER' },
  QT_SER: { sequence: 'PWS_QT_SER_SEQ', table: 'IAS_VND_QUOT_MST', column: 'QT_SER' },
  DOC_SER: { sequence: 'PWS_DOC_SER_SEQ', table: 'IAS_APS_QTN_CMPR_MST', column: 'DOC_SER' },
  G_SER: { sequence: 'PWS_G_SER_SEQ', table: 'GRN_MASTER', column: 'G_SER' },
  BILL_SER: { sequence: 'PWS_BILL_SER_SEQ', table: 'IAS_PI_BILL_MST', column: 'BILL_SER' },
};

async function nextFromSequence(
  conn: oracledb.Connection,
  sequenceName: string
): Promise<number | null> {
  try {
    const row = await executeQueryOnConn<{ NEXT_VAL: number }>(
      conn,
      `SELECT ${q(sequenceName)}.NEXTVAL AS NEXT_VAL FROM DUAL`
    );
    return row[0]?.NEXT_VAL ?? null;
  } catch {
    return null;
  }
}

async function nextFromMaxLock(
  conn: oracledb.Connection,
  table: string,
  column: string
): Promise<number> {
  const row = await executeQueryOnConn<{ NEXT_VAL: number }>(
    conn,
    `SELECT NVL(MAX(m.${column}), 0) + 1 AS NEXT_VAL FROM ${q(table)} m FOR UPDATE`
  );
  return row[0]?.NEXT_VAL ?? 1;
}

/** Allocate next document serial inside an open Oracle transaction. */
export async function nextSequenceValue(
  name: SequenceName,
  conn: oracledb.Connection
): Promise<number> {
  const meta = SEQ_MAP[name];
  const fromSeq = await nextFromSequence(conn, meta.sequence);
  if (fromSeq != null) return fromSeq;
  return nextFromMaxLock(conn, meta.table, meta.column);
}

/** Allocate next document number (PR_NO, PO_NO, …) for a given table/column. */
export async function nextDocumentNumber(
  conn: oracledb.Connection,
  table: string,
  noColumn: string
): Promise<number> {
  const row = await executeQueryOnConn<{ NEXT_NO: number }>(
    conn,
    `SELECT NVL(MAX(m.${noColumn}), 0) + 1 AS NEXT_NO FROM ${q(table)} m FOR UPDATE`
  );
  return row[0]?.NEXT_NO ?? 1;
}

/** Standalone helper (own connection) — prefer nextSequenceValue inside transactions. */
export async function peekNextSequenceValue(name: SequenceName): Promise<number> {
  const meta = SEQ_MAP[name];
  const row = await executeOne<{ NEXT_VAL: number }>(
    `SELECT NVL(MAX(m.${meta.column}), 0) + 1 AS NEXT_VAL FROM ${q(meta.table)} m`
  );
  return row?.NEXT_VAL ?? 1;
}
