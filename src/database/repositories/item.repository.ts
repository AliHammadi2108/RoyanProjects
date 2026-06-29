import { IAS_ITM_DTL_COLUMNS, IAS_ITM_MST_COLUMNS } from '@/database/oracleSchemaMap';
import { executeOne, executeQuery, q, type PaginatedResult, type PaginationParams } from './base.repository';

const M = IAS_ITM_MST_COLUMNS;
const D = IAS_ITM_DTL_COLUMNS;

export type OracleItemUnitRow = {
  I_CODE: string;
  ITM_UNT: string;
  P_SIZE: number;
  MAIN_UNIT: number;
  PUR_UNIT: number;
  SALE_UNIT: number;
  STOCK_UNIT: number;
  BARCODE: string | null;
  INACTIVE: number;
};

export type OracleItemRow = {
  I_CODE: string;
  I_NAME: string;
  I_E_NAME: string | null;
  G_CODE: string;
  I_DESC: string | null;
  ALTER_CODE: string | null;
  BLOCKED: number | null;
  INACTIVE: number;
  SERVICE_ITM: number | null;
  VAT_PER: number | null;
};

export type ItemUnitDto = {
  unit: string;
  factorToBase: number;
  isMain: boolean;
  isPurchase: boolean;
  isSale: boolean;
  isStock: boolean;
  barcode: string | null;
  isActive: boolean;
};

export type ItemDto = {
  code: string;
  nameAr: string;
  nameEn: string | null;
  groupCode: string;
  description: string | null;
  barcode: string | null;
  isBlocked: boolean;
  isActive: boolean;
  isService: boolean;
  vatPct: number;
  units: ItemUnitDto[];
};

export function mapItemUnitRow(row: OracleItemUnitRow): ItemUnitDto {
  return {
    unit: row.ITM_UNT,
    factorToBase: row.P_SIZE,
    isMain: row.MAIN_UNIT === 1,
    isPurchase: row.PUR_UNIT === 1,
    isSale: row.SALE_UNIT === 1,
    isStock: row.STOCK_UNIT === 1,
    barcode: row.BARCODE,
    isActive: row.INACTIVE !== 1,
  };
}

export function mapItemRow(row: OracleItemRow, units: ItemUnitDto[] = []): ItemDto {
  return {
    code: row.I_CODE,
    nameAr: row.I_NAME,
    nameEn: row.I_E_NAME,
    groupCode: row.G_CODE,
    description: row.I_DESC,
    barcode: row.ALTER_CODE,
    isBlocked: row.BLOCKED === 1,
    isActive: row.INACTIVE !== 1,
    isService: row.SERVICE_ITM === 1,
    vatPct: row.VAT_PER ?? 0,
    units,
  };
}

const SELECT_MST = `
  SELECT
    m.${M.code} AS I_CODE,
    m.${M.nameAr} AS I_NAME,
    m.${M.nameEn} AS I_E_NAME,
    m.${M.groupCode} AS G_CODE,
    m.${M.description} AS I_DESC,
    m.${M.barcode} AS ALTER_CODE,
    m.${M.isBlocked} AS BLOCKED,
    m.${M.isInactive} AS INACTIVE,
    m.${M.isService} AS SERVICE_ITM,
    m.${M.vatPct} AS VAT_PER
  FROM ${q('IAS_ITM_MST')} m
`;

const SELECT_DTL = `
  SELECT
    d.${D.itemCode} AS I_CODE,
    d.${D.unit} AS ITM_UNT,
    d.${D.factorToBase} AS P_SIZE,
    d.${D.isMain} AS MAIN_UNIT,
    d.${D.isPurchase} AS PUR_UNIT,
    d.${D.isSale} AS SALE_UNIT,
    d.${D.isStock} AS STOCK_UNIT,
    d.${D.barcode} AS BARCODE,
    d.${D.isInactive} AS INACTIVE
  FROM ${q('IAS_ITM_DTL')} d
`;

export async function listItemUnits(itemCode: string): Promise<ItemUnitDto[]> {
  const rows = await executeQuery<OracleItemUnitRow>(
    `${SELECT_DTL} WHERE d.${D.itemCode} = :itemCode ORDER BY d.${D.isMain} DESC, d.${D.unit}`,
    { itemCode }
  );
  return rows.map(mapItemUnitRow);
}

export async function findItemByCode(code: string): Promise<ItemDto | null> {
  const row = await executeOne<OracleItemRow>(
    `${SELECT_MST} WHERE m.${M.code} = :code`,
    { code }
  );
  if (!row) return null;
  const units = await listItemUnits(code);
  return mapItemRow(row, units);
}

export async function listItems(
  params: PaginationParams & { activeOnly?: boolean } = {}
): Promise<PaginatedResult<ItemDto>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const binds: Record<string, string | number> = { offset, pageSize };

  if (params.activeOnly) {
    conditions.push(`m.${M.isInactive} = 0`);
    conditions.push(`NVL(m.${M.isBlocked}, 0) = 0`);
  }
  if (params.search?.trim()) {
    conditions.push(`(
      UPPER(m.${M.code}) LIKE UPPER(:search)
      OR UPPER(m.${M.nameAr}) LIKE UPPER(:search)
      OR UPPER(NVL(m.${M.nameEn}, '')) LIKE UPPER(:search)
      OR UPPER(NVL(m.${M.barcode}, '')) LIKE UPPER(:search)
    )`);
    binds.search = `%${params.search.trim()}%`;
  }

  const where = conditions.join(' AND ');
  const countRow = await executeOne<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM ${q('IAS_ITM_MST')} m WHERE ${where}`,
    binds
  );
  const rows = await executeQuery<OracleItemRow>(
    `${SELECT_MST} WHERE ${where} ORDER BY m.${M.code}
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    binds
  );

  const items = await Promise.all(
    rows.map(async (row) => mapItemRow(row, await listItemUnits(row.I_CODE)))
  );

  return {
    rows: items,
    total: countRow?.CNT ?? 0,
    page,
    pageSize,
  };
}

export async function searchItemsForSelect(
  search: string,
  limit = 25
): Promise<Pick<ItemDto, 'code' | 'nameAr' | 'nameEn' | 'barcode' | 'units'>[]> {
  const result = await listItems({ search, pageSize: limit, activeOnly: true });
  return result.rows.map((item) => ({
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    barcode: item.barcode,
    units: item.units,
  }));
}
