import { V_DETAILS_COLUMNS } from '@/database/oracleSchemaMap';
import { executeOne, executeQuery, q, type PaginatedResult, type PaginationParams } from './base.repository';

const C = V_DETAILS_COLUMNS;

export type OracleSupplierRow = {
  V_CODE: string;
  V_A_CODE: string;
  V_A_NAME: string;
  V_E_NAME: string | null;
  V_PHONE: string | null;
  V_MOBILE: string | null;
  V_E_MAIL: string | null;
  V_ADDRESS: string | null;
  V_TAX_CODE: string | null;
  CR_NO: string | null;
  V_NOTE: string | null;
  INACTIVE: number;
  INACTIVE_PUR: number;
  BLK_LST: number;
  CREDIT_PERIOD: number | null;
  WHATSAPP_GRP: string | null;
  SEND_MSG: number | null;
  V_SINCE: Date | null;
};

export type SupplierDto = {
  code: string;
  accountCode: string;
  nameAr: string;
  nameEn: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  taxNo: string | null;
  commercialRegNo: string | null;
  notes: string | null;
  isActive: boolean;
  isPurchaseInactive: boolean;
  isBlacklisted: boolean;
  creditPeriod: number | null;
  whatsappGroup: string | null;
  sendMsg: boolean;
  since: Date | null;
};

function mapSupplierRow(row: OracleSupplierRow): SupplierDto {
  return {
    code: row.V_CODE,
    accountCode: row.V_A_CODE,
    nameAr: row.V_A_NAME,
    nameEn: row.V_E_NAME,
    phone: row.V_PHONE,
    mobile: row.V_MOBILE,
    email: row.V_E_MAIL,
    address: row.V_ADDRESS,
    taxNo: row.V_TAX_CODE,
    commercialRegNo: row.CR_NO,
    notes: row.V_NOTE,
    isActive: row.INACTIVE !== 1,
    isPurchaseInactive: row.INACTIVE_PUR === 1,
    isBlacklisted: row.BLK_LST === 1,
    creditPeriod: row.CREDIT_PERIOD,
    whatsappGroup: row.WHATSAPP_GRP,
    sendMsg: row.SEND_MSG === 1,
    since: row.V_SINCE,
  };
}

const SELECT_SQL = `
  SELECT
    v.${C.code} AS V_CODE,
    v.${C.accountCode} AS V_A_CODE,
    v.${C.nameAr} AS V_A_NAME,
    v.${C.nameEn} AS V_E_NAME,
    v.${C.phone} AS V_PHONE,
    v.${C.mobile} AS V_MOBILE,
    v.${C.email} AS V_E_MAIL,
    v.${C.address} AS V_ADDRESS,
    v.${C.taxNo} AS V_TAX_CODE,
    v.${C.commercialRegNo} AS CR_NO,
    v.${C.notes} AS V_NOTE,
    v.${C.isActive} AS INACTIVE,
    v.${C.isPurchaseInactive} AS INACTIVE_PUR,
    v.${C.isBlacklisted} AS BLK_LST,
    v.${C.creditPeriod} AS CREDIT_PERIOD,
    v.${C.whatsappGroup} AS WHATSAPP_GRP,
    v.${C.sendMsg} AS SEND_MSG,
    v.V_SINCE AS V_SINCE
  FROM ${q('V_DETAILS')} v
`;

export async function findSupplierByCode(code: string): Promise<SupplierDto | null> {
  const row = await executeOne<OracleSupplierRow>(
    `${SELECT_SQL} WHERE v.${C.code} = :code`,
    { code }
  );
  return row ? mapSupplierRow(row) : null;
}

export async function listSuppliers(
  params: PaginationParams & { activeOnly?: boolean; purchaseActiveOnly?: boolean } = {}
): Promise<PaginatedResult<SupplierDto>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['1=1'];
  const binds: Record<string, string | number> = { offset, pageSize };

  if (params.activeOnly) {
    conditions.push(`v.${C.isActive} = 0`);
  }
  if (params.purchaseActiveOnly) {
    conditions.push(`v.${C.isPurchaseInactive} = 0`);
    conditions.push(`v.${C.isBlacklisted} = 0`);
  }
  if (params.search?.trim()) {
    conditions.push(`(
      UPPER(v.${C.code}) LIKE UPPER(:search)
      OR UPPER(v.${C.accountCode}) LIKE UPPER(:search)
      OR UPPER(v.${C.nameAr}) LIKE UPPER(:search)
      OR UPPER(NVL(v.${C.nameEn}, '')) LIKE UPPER(:search)
      OR UPPER(NVL(v.${C.phone}, '')) LIKE UPPER(:search)
      OR UPPER(NVL(v.${C.mobile}, '')) LIKE UPPER(:search)
      OR UPPER(NVL(v.${C.taxNo}, '')) LIKE UPPER(:search)
    )`);
    binds.search = `%${params.search.trim()}%`;
  }

  const where = conditions.join(' AND ');

  const countRow = await executeOne<{ CNT: number }>(
    `SELECT COUNT(*) AS CNT FROM ${q('V_DETAILS')} v WHERE ${where}`,
    binds
  );

  const rows = await executeQuery<OracleSupplierRow>(
    `${SELECT_SQL}
     WHERE ${where}
     ORDER BY v.${C.nameAr}
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    binds
  );

  return {
    rows: rows.map(mapSupplierRow),
    total: countRow?.CNT ?? 0,
    page,
    pageSize,
  };
}

export async function searchSuppliersForSelect(
  search: string,
  limit = 25
): Promise<Pick<SupplierDto, 'code' | 'accountCode' | 'nameAr' | 'nameEn'>[]> {
  const result = await listSuppliers({ search, pageSize: limit, activeOnly: true, purchaseActiveOnly: true });
  return result.rows.map((s) => ({
    code: s.code,
    accountCode: s.accountCode,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
  }));
}
