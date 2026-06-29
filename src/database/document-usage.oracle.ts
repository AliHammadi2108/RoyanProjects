import type { DocumentUsageInfo, UsageDocumentType } from '@/services/used-document.service';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';
import { executeQuery, q } from '@/database/repositories/base.repository';

const USAGE_LABEL = 'مستخدم';

function usage(childType: string, childSer: number, childNo: string): DocumentUsageInfo {
  const id = String(childSer);
  return {
    isUsed: true,
    label: USAGE_LABEL,
    childType,
    childId: id,
    childNo,
    childRoute: `${DOCUMENT_ROUTES[childType] || '/purchases/tracking'}/${id}`,
  };
}

/** Check PWS_DOC_USAGE plus native Oracle FK references (PR_SER, QT_SER, PO_SER, …). */
export async function isDocumentUsedOracle(
  documentType: UsageDocumentType,
  documentSer: number
): Promise<DocumentUsageInfo> {
  const pws = await executeQuery<{ TARGET_TYPE: string; TARGET_SER: number }>(
    `SELECT TARGET_TYPE, TARGET_SER FROM ${q('PWS_DOC_USAGE')}
     WHERE SOURCE_TYPE = :sourceType AND SOURCE_SER = :sourceSer
     FETCH FIRST 1 ROWS ONLY`,
    { sourceType: documentType, sourceSer: documentSer }
  );
  if (pws[0]) {
    return usage(pws[0].TARGET_TYPE, pws[0].TARGET_SER, String(pws[0].TARGET_SER));
  }

  switch (documentType) {
    case 'PURCHASE_REQUEST': {
      const qt = await executeQuery<{ QT_SER: number; QT_NO: number }>(
        `SELECT d.QT_SER, m.QT_NO FROM ${q('IAS_VND_QUOT_DTL')} d
         JOIN ${q('IAS_VND_QUOT_MST')} m ON m.QT_SER = d.QT_SER
         WHERE d.PR_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (qt[0]) return usage('QUOTATION', qt[0].QT_SER, String(qt[0].QT_NO));

      const po = await executeQuery<{ PO_SER: number; PO_NO: number }>(
        `SELECT d.PO_SER, m.PO_NO FROM ${q('P_ORDER_DETAIL')} d
         JOIN ${q('P_ORDER')} m ON m.PO_SER = d.PO_SER
         WHERE d.PR_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (po[0]) return usage('PURCHASE_ORDER', po[0].PO_SER, String(po[0].PO_NO));
      break;
    }
    case 'QUOTATION': {
      const cmp = await executeQuery<{ DOC_SER: number; DOC_NO: number }>(
        `SELECT d.DOC_SER, m.DOC_NO FROM ${q('IAS_APS_QTN_CMPR_DTL')} d
         JOIN ${q('IAS_APS_QTN_CMPR_MST')} m ON m.DOC_SER = d.DOC_SER
         WHERE d.QT_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (cmp[0]) return usage('TECHNICAL_COMPARISON', cmp[0].DOC_SER, String(cmp[0].DOC_NO));

      const po = await executeQuery<{ PO_SER: number; PO_NO: number }>(
        `SELECT d.PO_SER, m.PO_NO FROM ${q('P_ORDER_DETAIL')} d
         JOIN ${q('P_ORDER')} m ON m.PO_SER = d.PO_SER
         WHERE d.QT_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (po[0]) return usage('PURCHASE_ORDER', po[0].PO_SER, String(po[0].PO_NO));
      break;
    }
    case 'PURCHASE_ORDER': {
      const grn = await executeQuery<{ G_SER: number; GR_NO: number }>(
        `SELECT d.G_SER, m.GR_NO FROM ${q('GRN_DETAIL')} d
         JOIN ${q('GRN_MASTER')} m ON m.G_SER = d.G_SER
         WHERE d.PO_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (grn[0]) return usage('RECEIVING', grn[0].G_SER, String(grn[0].GR_NO));

      const bill = await executeQuery<{ BILL_SER: number; BILL_NO: number }>(
        `SELECT d.BILL_SER, m.BILL_NO FROM ${q('IAS_PI_BILL_DTL')} d
         JOIN ${q('IAS_PI_BILL_MST')} m ON m.BILL_SER = d.BILL_SER
         WHERE d.PO_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (bill[0]) return usage('PURCHASE_INVOICE', bill[0].BILL_SER, String(bill[0].BILL_NO));
      break;
    }
    case 'RECEIVING': {
      const bill = await executeQuery<{ BILL_SER: number; BILL_NO: number }>(
        `SELECT d.BILL_SER, m.BILL_NO FROM ${q('IAS_PI_BILL_DTL')} d
         JOIN ${q('IAS_PI_BILL_MST')} m ON m.BILL_SER = d.BILL_SER
         WHERE d.G_SER = :ser FETCH FIRST 1 ROWS ONLY`,
        { ser: documentSer }
      );
      if (bill[0]) return usage('PURCHASE_INVOICE', bill[0].BILL_SER, String(bill[0].BILL_NO));
      break;
    }
    default:
      break;
  }

  return { isUsed: false };
}

export async function getOracleDocumentUsageMap(
  documentType: UsageDocumentType,
  documentSers: number[]
): Promise<Map<string, DocumentUsageInfo>> {
  const result = new Map<string, DocumentUsageInfo>();
  await Promise.all(
    documentSers.map(async (ser) => {
      const info = await isDocumentUsedOracle(documentType, ser);
      if (info.isUsed) result.set(String(ser), info);
    })
  );
  return result;
}

export function usageLabelAr(childType?: string): string {
  if (!childType) return USAGE_LABEL;
  return DOCUMENT_LABELS_AR[childType] ?? USAGE_LABEL;
}
