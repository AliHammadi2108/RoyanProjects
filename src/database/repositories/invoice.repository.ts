import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type PurchaseInvoiceListDto = DocumentListRow;

export const listPurchaseInvoices = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('purchase_invoice', params);

export const findPurchaseInvoiceBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('purchase_invoice', ser);

export { mapDocumentListRow as mapPurchaseInvoiceRow };
