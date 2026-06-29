import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type PurchaseOrderListDto = DocumentListRow;

export const listPurchaseOrders = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('purchase_order', params);

export const findPurchaseOrderBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('purchase_order', ser);

export { mapDocumentListRow as mapPurchaseOrderRow };
