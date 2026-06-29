import { VENDOR_CURR_COLUMNS } from '@/database/oracleSchemaMap';
import { executeOne, executeQuery, q } from './base.repository';
import type { SupplierDto } from './supplier.repository';
import { findSupplierByCode } from './supplier.repository';

const C = VENDOR_CURR_COLUMNS;

export type OracleVendorCurrencyRow = {
  V_CODE: string;
  A_CY: string;
  INACTIVE: number;
  CUR_DFLT: number | null;
  MAX_LMT_AMT_PR: number | null;
  MAX_LMT_AMT_PO: number | null;
};

export type VendorCurrencyDto = {
  supplierCode: string;
  currencyCode: string;
  isInactive: boolean;
  isDefault: boolean;
  maxLimitPr: number | null;
  maxLimitPo: number | null;
};

function mapVendorCurrencyRow(row: OracleVendorCurrencyRow): VendorCurrencyDto {
  return {
    supplierCode: row.V_CODE,
    currencyCode: row.A_CY,
    isInactive: row.INACTIVE === 1,
    isDefault: row.CUR_DFLT === 1,
    maxLimitPr: row.MAX_LMT_AMT_PR,
    maxLimitPo: row.MAX_LMT_AMT_PO,
  };
}

const SELECT_SQL = `
  SELECT
    vc.${C.supplierCode} AS V_CODE,
    vc.${C.currencyCode} AS A_CY,
    vc.${C.isInactive} AS INACTIVE,
    vc.${C.isDefault} AS CUR_DFLT,
    vc.${C.maxLimitPr} AS MAX_LMT_AMT_PR,
    vc.${C.maxLimitPo} AS MAX_LMT_AMT_PO
  FROM ${q('VENDOR_CURR')} vc
`;

export async function listVendorCurrenciesBySupplier(
  supplierCode: string,
  activeOnly = true
): Promise<VendorCurrencyDto[]> {
  const conditions = [`vc.${C.supplierCode} = :supplierCode`];
  if (activeOnly) {
    conditions.push(`vc.${C.isInactive} = 0`);
  }

  const rows = await executeQuery<OracleVendorCurrencyRow>(
    `${SELECT_SQL} WHERE ${conditions.join(' AND ')} ORDER BY vc.${C.isDefault} DESC, vc.${C.currencyCode}`,
    { supplierCode }
  );
  return rows.map(mapVendorCurrencyRow);
}

export async function getDefaultVendorCurrency(
  supplierCode: string
): Promise<VendorCurrencyDto | null> {
  const row = await executeOne<OracleVendorCurrencyRow>(
    `${SELECT_SQL}
     WHERE vc.${C.supplierCode} = :supplierCode
       AND vc.${C.isInactive} = 0
       AND vc.${C.isDefault} = 1`,
    { supplierCode }
  );
  return row ? mapVendorCurrencyRow(row) : null;
}

export async function assertVendorCurrencyAllowed(
  supplierCode: string,
  currencyCode: string
): Promise<void> {
  const currencies = await listVendorCurrenciesBySupplier(supplierCode, true);

  if (currencies.length === 0) {
    const defaultCur = await getDefaultVendorCurrency(supplierCode);
    if (defaultCur && defaultCur.currencyCode !== currencyCode) {
      throw new Error('العملة المختارة غير مرتبطة بهذا المورد');
    }
    return;
  }

  if (!currencies.some((c) => c.currencyCode === currencyCode)) {
    throw new Error('العملة المختارة غير مرتبطة بهذا المورد');
  }
}

export async function getSupplierWithCurrencies(supplierCode: string): Promise<{
  supplier: SupplierDto | null;
  currencies: VendorCurrencyDto[];
}> {
  const [supplier, currencies] = await Promise.all([
    findSupplierByCode(supplierCode),
    listVendorCurrenciesBySupplier(supplierCode),
  ]);
  return { supplier, currencies };
}
