/**
 * Screen → Oracle table/column mapping.
 * Source of truth for APS tables: APS_TBL.sql (schema IAS20251).
 * Supplemental web tables use PWS_ prefix (see scripts/oracle-supplemental-tables.sql).
 */

export const ORACLE_SCHEMA = process.env.ORACLE_SCHEMA ?? 'IAS20251';

/** Document lock flags in Oracle (NUMBER(1): 0/1). */
export const ORACLE_LOCK_FLAGS = {
  APPROVED: 'APPROVED',
  PROCESSED: 'PROCESSED',
  PO_PROCESSED: 'PO_PROCESSED',
  PO_CLOSED: 'PO_CLOSED',
  PO_LOCKED: 'PO_LOCKED',
  PO_PARTIAL: 'PO_PARTIAL',
  PR_SELECTED: 'PR_SELECTED',
  INACTIVE: 'INACTIVE',
  BILL_POST: 'BILL_POST',
  PRCSSD_FLG: 'PRCSSD_FLG',
  CHECK_STATUS: 'CHECK_STATUS',
} as const;

export type ScreenKey =
  | 'purchase_request'
  | 'quotation'
  | 'technical_comparison'
  | 'supplier_nomination'
  | 'purchase_order'
  | 'inspection'
  | 'receiving'
  | 'purchase_invoice'
  | 'supplier'
  | 'supplier_currency'
  | 'currency'
  | 'item'
  | 'warehouse'
  | 'supplier_payment'
  | 'approval_inbox'
  | 'notification'
  | 'reports';

export type OracleScreenMap = {
  screen: ScreenKey;
  route: string;
  masterTable: string;
  detailTable?: string;
  pkMaster: string;
  pkDetail?: string;
  serField: string;
  noField: string;
  dateField: string;
  supplierField?: string;
  currencyField?: string;
  rateField?: string;
  warehouseField?: string;
  lockFields: string[];
  prismaModel?: string;
};

export const SCREEN_MAP: Record<ScreenKey, OracleScreenMap> = {
  purchase_request: {
    screen: 'purchase_request',
    route: '/purchases/requests',
    masterTable: 'P_REQUEST',
    detailTable: 'P_REQUEST_DETAIL',
    pkMaster: 'PR_SER',
    pkDetail: 'RCRD_NO',
    serField: 'PR_SER',
    noField: 'PR_NO',
    dateField: 'PR_DATE',
    supplierField: 'V_CODE',
    currencyField: 'A_CY',
    warehouseField: 'W_CODE',
    lockFields: ['APPROVED', 'PR_SELECTED', 'INACTIVE', 'PR_PARTIAL'],
    prismaModel: 'PurchaseRequest',
  },
  quotation: {
    screen: 'quotation',
    route: '/purchases/quotations',
    masterTable: 'IAS_VND_QUOT_MST',
    detailTable: 'IAS_VND_QUOT_DTL',
    pkMaster: 'QT_SER',
    pkDetail: 'RCRD_NO',
    serField: 'QT_SER',
    noField: 'QT_NO',
    dateField: 'QT_DATE',
    supplierField: 'V_CODE',
    currencyField: 'A_CY',
    lockFields: ['APPROVED', 'PROCESSED', 'INACTIVE'],
    prismaModel: 'Quotation',
  },
  technical_comparison: {
    screen: 'technical_comparison',
    route: '/purchases/comparisons',
    masterTable: 'IAS_APS_QTN_CMPR_MST',
    detailTable: 'IAS_APS_QTN_CMPR_DTL',
    pkMaster: 'DOC_SER',
    serField: 'DOC_SER',
    noField: 'DOC_NO',
    dateField: 'DOC_DATE',
    currencyField: 'CUR_CODE',
    rateField: 'CUR_RATE',
    lockFields: ['APPROVED', 'PRCSSD_FLG', 'INACTIVE'],
    prismaModel: 'TechnicalComparison',
  },
  supplier_nomination: {
    screen: 'supplier_nomination',
    route: '/purchases/supplier-selection',
    masterTable: 'IAS_APS_QTN_CMPR_MST',
    detailTable: 'IAS_APS_QTN_CMPR_FLTR_DTL',
    pkMaster: 'DOC_SER',
    serField: 'DOC_SER',
    noField: 'DOC_NO',
    dateField: 'DOC_DATE',
    lockFields: ['APPROVED', 'PRCSSD_FLG'],
    prismaModel: 'SupplierNomination',
  },
  purchase_order: {
    screen: 'purchase_order',
    route: '/purchases/orders',
    masterTable: 'P_ORDER',
    detailTable: 'P_ORDER_DETAIL',
    pkMaster: 'PO_SER',
    pkDetail: 'RCRD_NO',
    serField: 'PO_SER',
    noField: 'PO_NO',
    dateField: 'PO_DATE',
    supplierField: 'V_CODE',
    currencyField: 'CUR_CODE',
    rateField: 'CUR_RATE',
    warehouseField: 'W_CODE',
    lockFields: ['APPROVED', 'PO_PROCESSED', 'PO_CLOSED', 'PO_LOCKED', 'INACTIVE'],
    prismaModel: 'PurchaseOrder',
  },
  inspection: {
    screen: 'inspection',
    route: '/purchases/inspections',
    masterTable: 'IAS_CHECK_INCM_MST',
    detailTable: 'IAS_CHECK_INCM_DTL',
    pkMaster: 'DOC_SER',
    serField: 'DOC_SER',
    noField: 'DOC_NO',
    dateField: 'DOC_DATE',
    supplierField: 'V_CODE',
    warehouseField: 'W_CODE',
    lockFields: ['APPROVED', 'PROCESSED'],
    prismaModel: 'PurchaseOrderInspection',
  },
  receiving: {
    screen: 'receiving',
    route: '/purchases/receivings',
    masterTable: 'GRN_MASTER',
    detailTable: 'GRN_DETAIL',
    pkMaster: 'G_SER',
    serField: 'G_SER',
    noField: 'GR_NO',
    dateField: 'GR_DATE',
    supplierField: 'V_CODE',
    currencyField: 'A_CY',
    warehouseField: 'W_CODE',
    lockFields: ['APPROVED', 'PROCESSED'],
    prismaModel: 'PurchaseReceiving',
  },
  purchase_invoice: {
    screen: 'purchase_invoice',
    route: '/purchases/invoices',
    masterTable: 'IAS_PI_BILL_MST',
    detailTable: 'IAS_PI_BILL_DTL',
    pkMaster: 'BILL_SER',
    serField: 'BILL_SER',
    noField: 'BILL_NO',
    dateField: 'BILL_DATE',
    supplierField: 'V_CODE',
    currencyField: 'BILL_CURRENCY',
    rateField: 'BILL_RATE',
    warehouseField: 'W_CODE',
    lockFields: ['BILL_POST', 'HUNG'],
    prismaModel: 'PurchaseInvoice',
  },
  supplier: {
    screen: 'supplier',
    route: '/settings/suppliers',
    masterTable: 'V_DETAILS',
    pkMaster: 'V_CODE',
    serField: 'V_CODE',
    noField: 'V_A_CODE',
    dateField: 'V_SINCE',
    lockFields: ['INACTIVE', 'INACTIVE_PUR', 'BLK_LST'],
    prismaModel: 'Supplier',
  },
  supplier_currency: {
    screen: 'supplier_currency',
    route: '/settings/suppliers',
    masterTable: 'VENDOR_CURR',
    pkMaster: 'V_CODE',
    serField: 'V_CODE',
    noField: 'A_CY',
    dateField: 'AD_DATE',
    currencyField: 'A_CY',
    lockFields: ['INACTIVE'],
    prismaModel: 'SupplierCurrency',
  },
  currency: {
    screen: 'currency',
    route: '/settings/currencies',
    masterTable: 'EX_RATE',
    pkMaster: 'CUR_CODE',
    serField: 'CUR_CODE',
    noField: 'CUR_CODE',
    dateField: 'AD_DATE',
    lockFields: ['INACTIVE'],
    prismaModel: 'Currency',
  },
  item: {
    screen: 'item',
    route: '/settings/items',
    masterTable: 'IAS_ITM_MST',
    detailTable: 'IAS_ITM_DTL',
    pkMaster: 'I_CODE',
    serField: 'I_CODE',
    noField: 'I_CODE',
    dateField: 'AD_DATE',
    lockFields: ['INACTIVE', 'BLOCKED'],
    prismaModel: 'Item',
  },
  warehouse: {
    screen: 'warehouse',
    route: '/settings/warehouses',
    masterTable: 'WAREHOUSE_DETAILS',
    pkMaster: 'W_CODE',
    serField: 'W_CODE',
    noField: 'W_CODE',
    dateField: 'AD_DATE',
    lockFields: ['INACTIVE'],
    prismaModel: 'Warehouse',
  },
  supplier_payment: {
    screen: 'supplier_payment',
    route: '/purchases/supplier-payments',
    masterTable: 'PWS_SUPPLIER_PAYMENT',
    detailTable: 'PWS_SUPPLIER_PAY_ALLOC',
    pkMaster: 'PAY_SER',
    serField: 'PAY_SER',
    noField: 'PAY_NO',
    dateField: 'PAY_DATE',
    supplierField: 'V_CODE',
    currencyField: 'A_CY',
    lockFields: ['APPROVED', 'POSTED'],
    prismaModel: 'SupplierPaymentVoucher',
  },
  approval_inbox: {
    screen: 'approval_inbox',
    route: '/approvals/inbox',
    masterTable: 'PWS_APPROVAL_REQUEST',
    detailTable: 'PWS_APPROVAL_ACTION',
    pkMaster: 'REQ_ID',
    serField: 'REQ_ID',
    noField: 'REQ_NO',
    dateField: 'REQ_DATE',
    lockFields: ['STATUS'],
    prismaModel: 'ApprovalRequest',
  },
  notification: {
    screen: 'notification',
    route: '/notifications',
    masterTable: 'PWS_NOTIFICATION',
    pkMaster: 'NOTIF_ID',
    serField: 'NOTIF_ID',
    noField: 'NOTIF_ID',
    dateField: 'CREATED_AT',
    lockFields: [],
    prismaModel: 'Notification',
  },
  reports: {
    screen: 'reports',
    route: '/reports',
    masterTable: 'P_REQUEST',
    serField: 'PR_SER',
    noField: 'PR_NO',
    dateField: 'PR_DATE',
    lockFields: [],
  },
};

/** Prisma field → Oracle column for suppliers (V_DETAILS). */
export const V_DETAILS_COLUMNS = {
  code: 'V_CODE',
  accountCode: 'V_A_CODE',
  nameAr: 'V_A_NAME',
  nameEn: 'V_E_NAME',
  phone: 'V_PHONE',
  mobile: 'V_MOBILE',
  email: 'V_E_MAIL',
  address: 'V_ADDRESS',
  taxNo: 'V_TAX_CODE',
  commercialRegNo: 'CR_NO',
  notes: 'V_NOTE',
  isActive: 'INACTIVE',
  isPurchaseInactive: 'INACTIVE_PUR',
  isBlacklisted: 'BLK_LST',
  creditPeriod: 'CREDIT_PERIOD',
  whatsappGroup: 'WHATSAPP_GRP',
  sendMsg: 'SEND_MSG',
  adUserId: 'AD_U_ID',
  adDate: 'AD_DATE',
  upUserId: 'UP_U_ID',
  upDate: 'UP_DATE',
} as const;

/** Prisma field → Oracle column for vendor currencies (VENDOR_CURR). */
export const VENDOR_CURR_COLUMNS = {
  supplierCode: 'V_CODE',
  currencyCode: 'A_CY',
  isInactive: 'INACTIVE',
  isDefault: 'CUR_DFLT',
  maxLimitPr: 'MAX_LMT_AMT_PR',
  maxLimitPo: 'MAX_LMT_AMT_PO',
} as const;

/** Prisma field → Oracle column for currencies (EX_RATE). */
export const EX_RATE_COLUMNS = {
  code: 'CUR_CODE',
  nameAr: 'CUR_A_NAME',
  nameEn: 'CUR_E_NAME',
  rate: 'CUR_RATE',
  isInactive: 'INACTIVE',
} as const;

/** Common line-item columns across purchase detail tables. */
export const LINE_ITEM_COLUMNS = {
  itemCode: 'I_CODE',
  qty: 'I_QTY',
  freeQty: 'FREE_QTY',
  unit: 'ITM_UNT',
  factorToBase: 'P_SIZE',
  baseQty: 'P_QTY',
  price: 'I_PRICE',
  discountAmt: 'DIS_AMT',
  discountPct: 'DIS_PER',
  vatPct: 'VAT_PER',
  vatAmt: 'VAT_AMT',
  lineDesc: 'ITEM_DESC',
  barcode: 'BARCODE',
  warehouse: 'W_CODE',
  recordNo: 'RCRD_NO',
} as const;

/** Purchase cycle document chain (Oracle ser fields). */
export const DOCUMENT_CHAIN = [
  { step: 'PR', table: 'P_REQUEST', ser: 'PR_SER', refInChild: 'PR_SER' },
  { step: 'QT', table: 'IAS_VND_QUOT_MST', ser: 'QT_SER', refInChild: 'QT_SER' },
  { step: 'CMP', table: 'IAS_APS_QTN_CMPR_MST', ser: 'DOC_SER' },
  { step: 'PO', table: 'P_ORDER', ser: 'PO_SER', refInChild: 'PO_SER' },
  { step: 'CHK', table: 'IAS_CHECK_INCM_MST', ser: 'DOC_SER' },
  { step: 'GRN', table: 'GRN_MASTER', ser: 'G_SER', refInChild: 'G_SER' },
  { step: 'PI', table: 'IAS_PI_BILL_MST', ser: 'BILL_SER' },
] as const;

export function getScreenMap(screen: ScreenKey): OracleScreenMap {
  return SCREEN_MAP[screen];
}

export function qualifyTable(tableName: string): string {
  return `${ORACLE_SCHEMA}.${tableName}`;
}
