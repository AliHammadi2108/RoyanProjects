import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type InspectionListDto = DocumentListRow;

export const listInspections = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('inspection', params);

export const findInspectionBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('inspection', ser);

export { mapDocumentListRow as mapInspectionRow };
