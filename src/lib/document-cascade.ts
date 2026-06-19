/** True when a new document is prefilled from a parent operation (cascade / انزال). */
export function isCascadeLockActive(
  isNew?: boolean,
  ...sourceIds: (string | undefined | null)[]
): boolean {
  return Boolean(isNew && sourceIds.some((id) => id));
}

/** Disable a header field when cascade lock is on unless the field stays editable in cascade mode. */
export function cascadeFieldDisabled(
  effectiveEditable: boolean,
  cascadeLock: boolean,
  editableInCascade = false
): boolean {
  if (!effectiveEditable) return true;
  if (cascadeLock && !editableInCascade) return true;
  return false;
}

/** Resolve preferred source document without falling back when an explicit id was requested. */
export function resolveSourceDocument<T extends { id: string }>(
  list: T[],
  preferredId?: string
): T | undefined {
  if (preferredId) return list.find((item) => item.id === preferredId);
  return list[0];
}

export interface ReceivingOrderSource {
  items: Array<{ itemId: string; itemNameSnapshot: string; quantity: number }>;
  inspections: Array<{
    id: string;
    items: Array<{ itemId: string; matchedQty: number }>;
  }>;
}

export function buildReceivingItemsFromOrder(
  order: ReceivingOrderSource | undefined,
  inspectionId?: string
) {
  if (!order) return [];

  const inspection =
    order.inspections.find((i) => i.id === inspectionId) || order.inspections[0];

  return order.items.map((item) => {
    const inspItem = inspection?.items.find((x) => x.itemId === item.itemId);
    return {
      itemId: item.itemId,
      itemNameSnapshot: item.itemNameSnapshot,
      receivedQty: inspItem?.matchedQty ?? item.quantity,
      freeQuantity: 0,
      notes: '',
    };
  });
}

export interface InvoiceOrderItemSource {
  itemId: string;
  unitId?: string | null;
  unitPrice: number;
  discount: number;
  tax: number;
}

export interface InvoiceReceivingItemSource {
  itemId: string;
  itemNameSnapshot: string;
  receivedQty: number;
}

export function buildInvoiceItemsFromReceiving(
  receivingItems: InvoiceReceivingItemSource[],
  orderItems: InvoiceOrderItemSource[] = []
) {
  return receivingItems.map((item) => {
    const orderItem = orderItems.find((o) => o.itemId === item.itemId);
    const quantity = item.receivedQty;
    const unitPrice = orderItem?.unitPrice ?? 0;
    const discount = orderItem?.discount ?? 0;
    const tax = orderItem?.tax ?? 0;
    const total = quantity * unitPrice - discount + tax;

    return {
      itemId: item.itemId,
      itemNameSnapshot: item.itemNameSnapshot,
      unitId: orderItem?.unitId || '',
      quantity,
      unitPrice,
      discount,
      tax,
      total,
      notes: '',
    };
  });
}

export interface ComparisonItemSource {
  itemId: string;
  itemNameSnapshot: string;
  unitId?: string | null;
  supplierId?: string | null;
  quantity: number;
  unitPrice: number;
  isSelected: boolean;
}

export function buildPurchaseOrderItemsFromComparison(items: ComparisonItemSource[]) {
  const selected = items.filter((i) => i.isSelected);
  const source = selected.length > 0 ? selected : items;

  return source.map((item) => ({
    itemId: item.itemId,
    itemNameSnapshot: item.itemNameSnapshot,
    unitId: item.unitId || '',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: 0,
    tax: 0,
    total: item.quantity * item.unitPrice,
    notes: '',
  }));
}

export function resolveComparisonSupplierId(items: ComparisonItemSource[]): string {
  const selected = items.filter((i) => i.isSelected);
  const source = selected.length > 0 ? selected : items;
  return source.find((i) => i.supplierId)?.supplierId || '';
}
