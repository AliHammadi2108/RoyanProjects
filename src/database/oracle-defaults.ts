/** Default Oracle branch/company keys for web-initiated documents (override via env). */
export const ORACLE_DOC_DEFAULTS = {
  CMP_NO: Number(process.env.ORACLE_CMP_NO ?? '1'),
  BRN_NO: Number(process.env.ORACLE_BRN_NO ?? '1'),
  BRN_YEAR: Number(process.env.ORACLE_BRN_YEAR ?? String(new Date().getFullYear())),
  BRN_USR: Number(process.env.ORACLE_BRN_USR ?? '1'),
  PR_TYPE: Number(process.env.ORACLE_PR_TYPE ?? '1'),
  PO_TYPE: Number(process.env.ORACLE_PO_TYPE ?? '1'),
  GRN_TYPE: Number(process.env.ORACLE_GRN_TYPE ?? '1'),
  PUR_TYPE: Number(process.env.ORACLE_PUR_TYPE ?? '0'),
  BILL_DOC_TYPE: Number(process.env.ORACLE_BILL_DOC_TYPE ?? '1'),
} as const;
