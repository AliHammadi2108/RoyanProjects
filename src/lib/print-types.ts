export interface PrintLineItem {
  itemCode: string;
  itemName: string;
  unit?: string;
  quantity: number;
  factorToBase?: number;
  baseQty?: number;
  unitPrice?: number;
  discount?: number;
  tax?: number;
  total?: number;
  notes?: string;
}

export interface PrintApprovalInfo {
  status: string;
  requestedBy?: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface PrintField {
  label: string;
  value: string;
}

export interface PrintTotal {
  label: string;
  value: string;
}

export interface PrintDocumentData {
  title: string;
  documentNo: string;
  documentDate: string;
  status: string;
  approvalStatus?: string;
  fields: PrintField[];
  lines: PrintLineItem[];
  totals: PrintTotal[];
  notes?: string;
  approval?: PrintApprovalInfo;
  statusBanner?: string;
  showLinePricing?: boolean;
  printedBy: string;
  operationType?: string;
  documentId?: string;
  supplierPhone?: string | null;
  partyName?: string;
}
