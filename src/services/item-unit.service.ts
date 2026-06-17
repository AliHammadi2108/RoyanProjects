import { prisma } from '@/lib/db';
import { calcBaseQty } from '@/lib/item-units';

export type ItemUnitMode = 'purchase' | 'sale';

export async function resolveItemUnitForLine(
  itemId: string,
  options?: { itemUnitId?: string; unitId?: string; mode?: ItemUnitMode }
) {
  const mode = options?.mode ?? 'purchase';

  if (options?.itemUnitId) {
    const iu = await prisma.itemUnit.findFirst({
      where: { id: options.itemUnitId, itemId, isActive: true },
      include: { unit: true },
    });
    if (!iu) throw new Error('وحدة الصنف غير صالحة');
    return iu;
  }

  if (options?.unitId) {
    const iu = await prisma.itemUnit.findFirst({
      where: { itemId, unitId: options.unitId, isActive: true },
      include: { unit: true },
    });
    if (!iu) throw new Error('وحدة الصنف غير مرتبطة بهذا الصنف');
    return iu;
  }

  const defaultField = mode === 'purchase' ? 'isDefaultPurchase' : 'isDefaultSale';
  const preferred = await prisma.itemUnit.findFirst({
    where: { itemId, isActive: true, [defaultField]: true },
    include: { unit: true },
  });
  if (preferred) return preferred;

  const base = await prisma.itemUnit.findFirst({
    where: { itemId, isActive: true, isBase: true },
    include: { unit: true },
  });
  if (base) return base;

  const any = await prisma.itemUnit.findFirst({
    where: { itemId, isActive: true },
    include: { unit: true },
  });
  if (!any) throw new Error('الصنف لا يحتوي على وحدات معرّفة');
  return any;
}

export async function buildLineItemUnitFields(
  itemId: string,
  quantity: number,
  options?: { itemUnitId?: string; unitId?: string; mode?: ItemUnitMode }
) {
  const iu = await resolveItemUnitForLine(itemId, options);
  const factorToBase = iu.factorToBase > 0 ? iu.factorToBase : 1;
  return {
    itemUnitId: iu.id,
    unitId: iu.unitId,
    factorToBase,
    baseQty: calcBaseQty(quantity, factorToBase),
  };
}

export async function validateItemUnits(itemUnits: Array<{
  unitId: string;
  isBase: boolean;
  factorToBase: number;
  isDefaultPurchase?: boolean;
  isDefaultSale?: boolean;
}>) {
  if (itemUnits.length === 0) {
    throw new Error('يجب إضافة وحدة واحدة على الأقل للصنف');
  }
  const baseCount = itemUnits.filter((u) => u.isBase).length;
  if (baseCount !== 1) {
    throw new Error('يجب تحديد وحدة أساسية واحدة فقط للصنف');
  }
  const unitIds = itemUnits.map((u) => u.unitId);
  if (new Set(unitIds).size !== unitIds.length) {
    throw new Error('لا يمكن تكرار نفس الوحدة لنفس الصنف');
  }
  for (const u of itemUnits) {
    if (u.factorToBase <= 0) {
      throw new Error('معامل التحويل للوحدة الأساسية يجب أن يكون أكبر من صفر');
    }
  }
}
