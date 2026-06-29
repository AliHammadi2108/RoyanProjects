import {
  findPurchaseCycleDocumentBySer,
  listPurchaseCycleDocuments,
  mapDocumentListRow,
  type DocumentListRow,
} from './purchase-cycle.shared';

export type ComparisonListDto = DocumentListRow;

export const listComparisons = (params?: Parameters<typeof listPurchaseCycleDocuments>[1]) =>
  listPurchaseCycleDocuments('comparison', params);

export const findComparisonBySer = (ser: number) =>
  findPurchaseCycleDocumentBySer('comparison', ser);

export { mapDocumentListRow as mapComparisonRow };
