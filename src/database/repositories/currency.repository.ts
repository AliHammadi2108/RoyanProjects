import { EX_RATE_COLUMNS } from '@/database/oracleSchemaMap';
import { executeOne, executeQuery, q, type PaginatedResult, type PaginationParams } from './base.repository';

const C = EX_RATE_COLUMNS;

export type OracleCurrencyRow = {
  CUR_CODE: string;
  CUR_A_NAME: string;
  CUR_E_NAME: string | null;
  CUR_RATE: number;
  INACTIVE: number;
};

export type CurrencyDto = {
  code: string;
  nameAr: string;
  nameEn: string | null;
  rate: number;
  isActive: boolean;
};

export function mapCurrencyRow(row: OracleCurrencyRow): CurrencyDto {
  return {
    code: row.CUR_CODE,
    nameAr: row.CUR_A_NAME,
    nameEn: row.CUR_E_NAME,
    rate: row.CUR_RATE,
    isActive: row.INACTIVE !== 1,
  };
}

const SELECT_SQL = `
  SELECT
    c.${C.code} AS CUR_CODE,
    c.${C.nameAr} AS CUR_A_NAME,
    c.${C.nameEn} AS CUR_E_NAME,
    c.${C.rate} AS CUR_RATE,
    c.${C.isInactive} AS INACTIVE
  FROM ${q('EX_RATE')} c
`;

export async function findCurrencyByCode(code: string): Promise<CurrencyDto | null> {
  const row = await executeOne<OracleCurrencyRow>(
    `${SELECT_SQL} WHERE c.${C.code} = :code`,
    { code }
  );
  return row ? mapCurrencyRow(row) : null;
}

export async function listCurrencies(
  params: PaginationParams & { activeOnly?: boolean } = {}
): Promise<PaginatedResult<CurrencyDto>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const binds: Record<string, string | number> = { offset, pageSize };

  if (params.activeOnly) conditions.push(`c.${C.isInactive} = 0`);
  if (params.search?.trim()) {
    conditions.push(`(
      UPPER(c.${C.code}) LIKE UPPER(:search)
      OR UPPER(c.${C.nameAr}) LIKE UPPER(:search)
      OR UPPER(NVL(c.${C.nameEn}, '')) LIKE UPPER(:search)
    )`);
    binds.search = `%${params.search.trim()}%`;
  }

  const where = conditions.join(' AND ');
  const countRow = await executeOne<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM ${q('EX_RATE')} c WHERE ${where}`,
    binds
  );
  const rows = await executeQuery<OracleCurrencyRow>(
    `${SELECT_SQL} WHERE ${where} ORDER BY c.${C.code}
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    binds
  );

  return {
    rows: rows.map(mapCurrencyRow),
    total: countRow?.CNT ?? 0,
    page,
    pageSize,
  };
}
