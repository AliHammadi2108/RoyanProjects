import { buildLineItemUnitFields } from '@/services/item-unit.service';
import type { ItemUnitMode } from '@/services/item-unit.service';

type LineItemInput = {
  itemId: string;
  itemNameSnapshot: string;
  itemUnitId?: string;
  unitId?: string;
  factorToBase?: number;
  baseQty?: number;
  quantity: number;
  [key: string]: unknown;
};

export async function enrichPurchaseLineItems<T extends LineItemInput>(
  items: T[],
  mode: ItemUnitMode = 'purchase'
) {
  return Promise.all(
    items.map(async (item, idx) => {
      const unitFields = await buildLineItemUnitFields(item.itemId, item.quantity, {
        itemUnitId: item.itemUnitId,
        unitId: item.unitId,
        mode,
      });
      return {
        ...item,
        ...unitFields,
        sortOrder: idx,
      };
    })
  );
}

export async function resolveExchangeRate(currencyId?: string | null) {
  if (!currencyId) return 1;
  const currency = await import('@/lib/db').then((m) =>
    m.prisma.currency.findUnique({ where: { id: currencyId } })
  );
  if (!currency) return 1;
  return currency.rateToBase > 0 ? currency.rateToBase : currency.rate || 1;
}
