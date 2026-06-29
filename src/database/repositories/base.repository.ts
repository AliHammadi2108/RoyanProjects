import oracledb from 'oracledb';
import { getOracleConnection, q, withOracleTransaction } from '@/database/oracle';

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export async function executeQuery<T extends object>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options?: oracledb.ExecuteOptions
): Promise<T[]> {
  const conn = await getOracleConnection();
  try {
    const result = await conn.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
    return (result.rows ?? []) as T[];
  } finally {
    await conn.close();
  }
}

export async function executeOne<T extends object>(
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, binds);
  return rows[0] ?? null;
}

export async function executeQueryOnConn<T extends object>(
  conn: oracledb.Connection,
  sql: string,
  binds: oracledb.BindParameters = {},
  options?: oracledb.ExecuteOptions
): Promise<T[]> {
  const result = await conn.execute<T>(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    ...options,
  });
  return (result.rows ?? []) as T[];
}

export async function executeOneOnConn<T extends object>(
  conn: oracledb.Connection,
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<T | null> {
  const rows = await executeQueryOnConn<T>(conn, sql, binds);
  return rows[0] ?? null;
}

export async function executeDmlOnConn(
  conn: oracledb.Connection,
  sql: string,
  binds: oracledb.BindParameters = {}
): Promise<number> {
  const result = await conn.execute(sql, binds, { autoCommit: false });
  return result.rowsAffected ?? 0;
}

export { q, withOracleTransaction };
