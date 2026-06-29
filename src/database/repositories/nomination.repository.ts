import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type NominationListDto = DocumentListRow;

export const listNominations = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('nomination', params);

export const findNominationBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('nomination', ser);

export { mapDocumentListRow as mapNominationRow };
