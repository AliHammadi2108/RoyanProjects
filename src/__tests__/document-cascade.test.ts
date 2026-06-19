import { describe, it, expect } from 'vitest';
import {
  resolveSourceDocument,
  buildReceivingItemsFromOrder,
  buildInvoiceItemsFromReceiving,
  buildPurchaseOrderItemsFromComparison,
  resolveComparisonSupplierId,
  isCascadeLockActive,
  cascadeFieldDisabled,
} from '@/lib/document-cascade';

describe('document-cascade', () => {
  const list = [
    { id: 'a', name: 'First' },
    { id: 'b', name: 'Second' },
  ];

  it('resolveSourceDocument prefers explicit id', () => {
    expect(resolveSourceDocument(list, 'b')?.name).toBe('Second');
  });

  it('resolveSourceDocument does not fallback when explicit id missing', () => {
    expect(resolveSourceDocument(list, 'missing')).toBeUndefined();
  });

  it('buildReceivingItemsFromOrder uses inspection matched quantities', () => {
    const order = {
      items: [{ itemId: 'i1', itemNameSnapshot: 'Item 1', quantity: 10 }],
      inspections: [
        {
          id: 'insp1',
          items: [{ itemId: 'i1', matchedQty: 8 }],
        },
      ],
    };

    const items = buildReceivingItemsFromOrder(order, 'insp1');
    expect(items[0].receivedQty).toBe(8);
  });

  it('buildInvoiceItemsFromReceiving pulls prices from order items', () => {
    const items = buildInvoiceItemsFromReceiving(
      [{ itemId: 'i1', itemNameSnapshot: 'Item 1', receivedQty: 5 }],
      [{ itemId: 'i1', unitPrice: 100, discount: 10, tax: 5 }]
    );

    expect(items[0].quantity).toBe(5);
    expect(items[0].unitPrice).toBe(100);
    expect(items[0].total).toBe(495);
  });

  it('buildPurchaseOrderItemsFromComparison uses selected lines', () => {
    const items = buildPurchaseOrderItemsFromComparison([
      {
        itemId: 'i1',
        itemNameSnapshot: 'A',
        quantity: 2,
        unitPrice: 50,
        isSelected: true,
        supplierId: 's1',
      },
      {
        itemId: 'i2',
        itemNameSnapshot: 'B',
        quantity: 1,
        unitPrice: 20,
        isSelected: false,
        supplierId: 's2',
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].total).toBe(100);
  });

  it('resolveComparisonSupplierId picks supplier from selected items', () => {
    const supplierId = resolveComparisonSupplierId([
      { itemId: 'i1', itemNameSnapshot: 'A', quantity: 1, unitPrice: 1, isSelected: true, supplierId: 's1' },
      { itemId: 'i2', itemNameSnapshot: 'B', quantity: 1, unitPrice: 1, isSelected: false, supplierId: 's2' },
    ]);

    expect(supplierId).toBe('s1');
  });

  it('isCascadeLockActive only on new documents with a parent source', () => {
    expect(isCascadeLockActive(true, 'src-1')).toBe(true);
    expect(isCascadeLockActive(true, undefined, 'src-2')).toBe(true);
    expect(isCascadeLockActive(false, 'src-1')).toBe(false);
    expect(isCascadeLockActive(true)).toBe(false);
  });

  it('cascadeFieldDisabled allows only cascade-editable fields', () => {
    expect(cascadeFieldDisabled(true, true, false)).toBe(true);
    expect(cascadeFieldDisabled(true, true, true)).toBe(false);
    expect(cascadeFieldDisabled(false, true, true)).toBe(true);
    expect(cascadeFieldDisabled(true, false, false)).toBe(false);
  });
});
