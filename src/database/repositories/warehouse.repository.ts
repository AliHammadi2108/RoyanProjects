import { WAREHOUSE_COLUMNS } from '@/database/oracleSchemaMap';
import { executeOne, executeQuery, q, type PaginatedResult, type PaginationParams } from './base.repository';

const C = WAREHOUSE_COLUMNS;

export type OracleWarehouseRow = {
  W_CODE: number;
  W_A_NAME: string;
  W_E_NAME: string | null;
  INACTIVE: number;
};

export type WarehouseDto = {
  code: string;
  nameAr: string;
  nameEn: string | null;
  isActive: boolean;
};

export function mapWarehouseRow(row: OracleWarehouseRow): WarehouseDto {
  return {
    code: String(row.W_CODE),
    nameAr: row.W_A_NAME,
    nameEn: row.W_E_NAME,
    isActive: row.INACTIVE !== 1,
  };
}

const SELECT_SQL = `
  SELECT
    w.${C.code} AS W_CODE,
    w.${C.nameAr} AS W_A_NAME,
    w.${C.nameEn} AS W_E_NAME,
    w.${C.isInactive} AS INACTIVE
  FROM ${q('WAREHOUSE_DETAILS')} w
`;

export async function findWarehouseByCode(code: string): Promise<WarehouseDto | null> {
  const row = await executeOne<OracleWarehouseRow>(
    `${SELECT_SQL} WHERE w.${C.code} = :code`,
    { code: Number(code) }
  );
  return row ? mapWarehouseRow(row) : null;
}

export async function listWarehouses(
  params: PaginationParams & { activeOnly?: boolean } = {}
): Promise<PaginatedResult<WarehouseDto>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const binds: Record<string, string | number> = { offset, pageSize };

  if (params.activeOnly) conditions.push(`w.${C.isInactive} = 0`);
  if (params.search?.trim()) {
    conditions.push(`(
      TO_CHAR(w.${C.code}) LIKE :search
      OR UPPER(w.${C.nameAr}) LIKE UPPER(:search)
      OR UPPER(NVL(w.${C.nameEn}, '')) LIKE UPPER(:search)
    )`);
    binds.search = `%${params.search.trim()}%`;
  }

  const where = conditions.join(' AND ');
  const countRow = await executeOne<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM ${q('WAREHOUSE_DETAILS')} w WHERE ${where}`,
    binds
  );
  const rows = await executeQuery<OracleWarehouseRow>(
    `${SELECT_SQL} WHERE ${where} ORDER BY w.${C.code}
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    binds
  );

  return {
    rows: rows.map(mapWarehouseRow),
    total: countRow?.CNT ?? 0,
    page,
    pageSize,
  };
}

export async function searchWarehousesForSelect(
  search: string,
  limit = 25
): Promise<WarehouseDto[]> {
  const result = await listWarehouses({ search, pageSize: limit, activeOnly: true });
  return result.rows;
}
