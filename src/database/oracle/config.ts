import oracledb from 'oracledb';

export type OracleConfig = {
  user: string;
  password: string;
  connectString: string;
  schema: string;
  poolMin: number;
  poolMax: number;
  poolIncrement: number;
};

function buildConnectString(): string {
  const host = process.env.ORACLE_HOST ?? 'localhost';
  const port = process.env.ORACLE_PORT ?? '1521';
  const sid = process.env.ORACLE_SID;
  const serviceName = process.env.ORACLE_SERVICE_NAME;

  if (sid) {
    return `${host}:${port}/${sid}`;
  }
  return `${host}:${port}/${serviceName ?? 'ORCL'}`;
}

export function getOracleConfig(): OracleConfig {
  const poolMin = Number(process.env.ORACLE_POOL_MIN ?? '1');
  const poolMax = Number(process.env.ORACLE_POOL_MAX ?? '10');
  const poolIncrement = Number(process.env.ORACLE_POOL_INCREMENT ?? '1');

  return {
    user: process.env.ORACLE_USER ?? '',
    password: process.env.ORACLE_PASSWORD ?? '',
    connectString: buildConnectString(),
    schema: process.env.ORACLE_SCHEMA ?? 'IAS20251',
    poolMin,
    poolMax,
    poolIncrement,
  };
}

export function isOracleConfigured(): boolean {
  const cfg = getOracleConfig();
  return Boolean(cfg.user && cfg.password);
}

/** Qualify table name with configured schema (e.g. IAS20251.P_ORDER). */
export function q(tableName: string): string {
  return `${getOracleConfig().schema}.${tableName}`;
}

let pool: oracledb.Pool | null = null;

export async function getOraclePool(): Promise<oracledb.Pool> {
  if (pool) return pool;

  const cfg = getOracleConfig();
  if (!cfg.user || !cfg.password) {
    throw new Error(
      'Oracle not configured: set ORACLE_USER, ORACLE_PASSWORD, and connection env vars.'
    );
  }

  pool = await oracledb.createPool({
    user: cfg.user,
    password: cfg.password,
    connectString: cfg.connectString,
    poolMin: cfg.poolMin,
    poolMax: cfg.poolMax,
    poolIncrement: cfg.poolIncrement,
  });

  return pool;
}

export async function getOracleConnection(): Promise<oracledb.Connection> {
  const p = await getOraclePool();
  return p.getConnection();
}

export async function withOracleTransaction<T>(
  fn: (conn: oracledb.Connection) => Promise<T>
): Promise<T> {
  const conn = await getOracleConnection();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    await conn.close();
  }
}

export async function closeOraclePool(): Promise<void> {
  if (pool) {
    await pool.close(0);
    pool = null;
  }
}
