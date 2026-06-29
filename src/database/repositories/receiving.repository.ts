import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type ReceivingListDto = DocumentListRow;

export const listReceivings = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('receiving', params);

export const findReceivingBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('receiving', ser);

export { mapDocumentListRow as mapReceivingRow };
