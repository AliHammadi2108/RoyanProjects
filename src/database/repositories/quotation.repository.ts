import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type QuotationListDto = DocumentListRow;

export const listQuotations = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('quotation', params);

export const findQuotationBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('quotation', ser);

export { mapDocumentListRow as mapQuotationRow };
