'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import {
  currencySchema,
  supplierSchema,
  unitSchema,
  itemSchema,
} from '@/lib/validations';
import { validateItemUnits } from '@/services/item-unit.service';
import { toOptionalId, formatActionError } from '@/lib/utils';
import { createAuditLog } from '@/services/audit.service';

const SETTINGS_PATHS = [
  '/settings/currencies',
  '/settings/suppliers',
  '/settings/units',
  '/settings/items',
];

function revalidateSettings() {
  SETTINGS_PATHS.forEach((p) => revalidatePath(p));
}

async function assertCurrencyNotUsed(id: string) {
  const used =
    (await prisma.purchaseRequest.count({ where: { currencyId: id } })) +
    (await prisma.quotation.count({ where: { currencyId: id } })) +
    (await prisma.purchaseOrder.count({ where: { currencyId: id } })) +
    (await prisma.supplier.count({ where: { defaultCurrencyId: id } }));
  if (used > 0) throw new Error('لا يمكن حذف العملة لأنها مستخدمة في عمليات سابقة');
}

async function assertSupplierNotUsed(id: string) {
  const used =
    (await prisma.purchaseRequest.count({ where: { supplierId: id } })) +
    (await prisma.quotation.count({ where: { supplierId: id } })) +
    (await prisma.purchaseOrder.count({ where: { supplierId: id } }));
  if (used > 0) throw new Error('لا يمكن حذف المورد لأنه مستخدم في عمليات سابقة');
}

async function assertUnitNotUsed(id: string) {
  const used =
    (await prisma.itemUnit.count({ where: { unitId: id } })) +
    (await prisma.item.count({ where: { unitId: id } }));
  if (used > 0) throw new Error('لا يمكن حذف الوحدة لأنها مستخدمة');
}

// ==================== Currencies ====================

export async function getCurrencies(filters?: { search?: string; activeOnly?: boolean }) {
  await requirePermission('master.currencies.view');
  return prisma.currency.findMany({
    where: {
      ...(filters?.activeOnly && { isActive: true }),
      ...(filters?.search && {
        OR: [
          { code: { contains: filters.search } },
          { nameAr: { contains: filters.search } },
        ],
      }),
    },
    orderBy: [{ isBase: 'desc' }, { code: 'asc' }],
  });
}

export async function getCurrency(id: string) {
  await requirePermission('master.currencies.view');
  return prisma.currency.findUnique({ where: { id } });
}

export async function saveCurrency(data: unknown, id?: string) {
  const user = await requirePermission(id ? 'master.currencies.edit' : 'master.currencies.create');
  const parsed = currencySchema.parse(data);

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (parsed.isBase) {
        await tx.currency.updateMany({
          where: { isBase: true, ...(id ? { NOT: { id } } : {}) },
          data: { isBase: false },
        });
        parsed.rateToBase = 1;
      }

      const payload = {
        code: parsed.code.toUpperCase(),
        nameAr: parsed.nameAr,
        nameEn: parsed.nameEn,
        symbol: parsed.symbol,
        rate: parsed.rateToBase,
        rateToBase: parsed.isBase ? 1 : parsed.rateToBase,
        isBase: parsed.isBase,
        isActive: parsed.isActive,
      };

      const row = id
        ? await tx.currency.update({ where: { id }, data: payload })
        : await tx.currency.create({ data: payload });

      return row;
    });

    await createAuditLog({
      userId: user.id,
      action: id ? 'UPDATE' : 'CREATE',
      entityType: 'CURRENCY',
      entityId: result.id,
    });

    revalidateSettings();
    return result;
  } catch (e) {
    throw new Error(formatActionError(e));
  }
}

export async function setCurrencyActive(id: string, isActive: boolean) {
  const user = await requirePermission(isActive ? 'master.currencies.activate' : 'master.currencies.deactivate');
  const currency = await prisma.currency.findUnique({ where: { id } });
  if (!currency) throw new Error('العملة غير موجودة');
  if (!isActive && currency.isBase) throw new Error('لا يمكن تعطيل العملة الأساسية');

  const result = await prisma.currency.update({ where: { id }, data: { isActive } });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'CURRENCY', entityId: id });
  revalidateSettings();
  return result;
}

export async function setBaseCurrency(id: string) {
  const user = await requirePermission('master.currencies.edit');
  await prisma.$transaction(async (tx) => {
    await tx.currency.updateMany({ data: { isBase: false } });
    await tx.currency.update({
      where: { id },
      data: { isBase: true, rateToBase: 1, rate: 1, isActive: true },
    });
  });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'CURRENCY', entityId: id });
  revalidateSettings();
}

export async function deleteCurrency(id: string) {
  const user = await requirePermission('master.currencies.delete');
  const currency = await prisma.currency.findUnique({ where: { id } });
  if (!currency) throw new Error('العملة غير موجودة');
  if (currency.isBase) throw new Error('لا يمكن حذف العملة الأساسية');
  await assertCurrencyNotUsed(id);
  await prisma.currency.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'CURRENCY', entityId: id });
  revalidateSettings();
}

// ==================== Suppliers ====================

export async function getSuppliersSettings(filters?: { search?: string; activeOnly?: boolean }) {
  await requirePermission('master.suppliers.view');
  return prisma.supplier.findMany({
    where: {
      ...(filters?.activeOnly && { isActive: true }),
      ...(filters?.search && {
        OR: [
          { code: { contains: filters.search } },
          { nameAr: { contains: filters.search } },
          { phone: { contains: filters.search } },
        ],
      }),
    },
    include: { defaultCurrency: true },
    orderBy: { code: 'asc' },
  });
}

export async function getSupplierSettings(id: string) {
  await requirePermission('master.suppliers.view');
  return prisma.supplier.findUnique({
    where: { id },
    include: { defaultCurrency: true },
  });
}

export async function saveSupplier(data: unknown, id?: string) {
  const user = await requirePermission(id ? 'master.suppliers.edit' : 'master.suppliers.create');
  const parsed = supplierSchema.parse(data);

  const payload = {
    code: parsed.code,
    nameAr: parsed.nameAr,
    nameEn: parsed.nameEn,
    phone: parsed.phone,
    email: parsed.email || null,
    address: parsed.address,
    taxNo: parsed.taxNo,
    defaultCurrencyId: parsed.defaultCurrencyId,
    openingBalance: parsed.openingBalance,
    notes: parsed.notes,
    isActive: parsed.isActive,
  };

  try {
    const result = id
      ? await prisma.supplier.update({ where: { id }, data: payload })
      : await prisma.supplier.create({ data: payload });

    await createAuditLog({
      userId: user.id,
      action: id ? 'UPDATE' : 'CREATE',
      entityType: 'SUPPLIER',
      entityId: result.id,
    });
    revalidateSettings();
    return result;
  } catch (e) {
    throw new Error(formatActionError(e));
  }
}

export async function setSupplierActive(id: string, isActive: boolean) {
  const user = await requirePermission(isActive ? 'master.suppliers.activate' : 'master.suppliers.deactivate');
  const result = await prisma.supplier.update({ where: { id }, data: { isActive } });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'SUPPLIER', entityId: id });
  revalidateSettings();
  return result;
}

export async function deleteSupplier(id: string) {
  const user = await requirePermission('master.suppliers.delete');
  await assertSupplierNotUsed(id);
  await prisma.supplier.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'SUPPLIER', entityId: id });
  revalidateSettings();
}

// ==================== Units ====================

export async function getUnitsSettings(filters?: { search?: string; activeOnly?: boolean }) {
  await requirePermission('master.units.view');
  return prisma.unit.findMany({
    where: {
      ...(filters?.activeOnly && { isActive: true }),
      ...(filters?.search && {
        OR: [
          { code: { contains: filters.search } },
          { nameAr: { contains: filters.search } },
        ],
      }),
    },
    orderBy: { code: 'asc' },
  });
}

export async function getUnitSettings(id: string) {
  await requirePermission('master.units.view');
  return prisma.unit.findUnique({ where: { id } });
}

export async function saveUnit(data: unknown, id?: string) {
  const user = await requirePermission(id ? 'master.units.edit' : 'master.units.create');
  const parsed = unitSchema.parse(data);

  const payload = {
    code: parsed.code,
    nameAr: parsed.nameAr,
    nameEn: parsed.nameEn,
    symbol: parsed.symbol,
    description: parsed.description,
    isActive: parsed.isActive,
  };

  try {
    const result = id
      ? await prisma.unit.update({ where: { id }, data: payload })
      : await prisma.unit.create({ data: payload });

    await createAuditLog({
      userId: user.id,
      action: id ? 'UPDATE' : 'CREATE',
      entityType: 'UNIT',
      entityId: result.id,
    });
    revalidateSettings();
    return result;
  } catch (e) {
    throw new Error(formatActionError(e));
  }
}

export async function setUnitActive(id: string, isActive: boolean) {
  const user = await requirePermission(isActive ? 'master.units.activate' : 'master.units.deactivate');
  const result = await prisma.unit.update({ where: { id }, data: { isActive } });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'UNIT', entityId: id });
  revalidateSettings();
  return result;
}

export async function deleteUnit(id: string) {
  const user = await requirePermission('master.units.delete');
  await assertUnitNotUsed(id);
  await prisma.unit.delete({ where: { id } });
  await createAuditLog({ userId: user.id, action: 'DELETE', entityType: 'UNIT', entityId: id });
  revalidateSettings();
}

// ==================== Items ====================

export async function getItemsSettings(filters?: { search?: string; activeOnly?: boolean }) {
  await requirePermission('master.items.view');
  return prisma.item.findMany({
    where: {
      ...(filters?.activeOnly && { isActive: true }),
      ...(filters?.search && {
        OR: [
          { code: { contains: filters.search } },
          { nameAr: { contains: filters.search } },
          { barcode: { contains: filters.search } },
        ],
      }),
    },
    include: {
      category: true,
      preferredSupplier: { select: { id: true, code: true, nameAr: true } },
      itemUnits: { include: { unit: true }, orderBy: { isBase: 'desc' } },
      itemWarehouseReorders: { include: { warehouse: { select: { id: true, code: true, nameAr: true } } } },
    },
    orderBy: { code: 'asc' },
  });
}

export async function getItemSettings(id: string) {
  await requirePermission('master.items.view');
  return prisma.item.findUnique({
    where: { id },
    include: {
      category: true,
      preferredSupplier: { select: { id: true, code: true, nameAr: true } },
      itemUnits: { include: { unit: true }, orderBy: { isBase: 'desc' } },
      itemWarehouseReorders: { include: { warehouse: { select: { id: true, code: true, nameAr: true } } } },
    },
  });
}

export async function saveItem(data: unknown, id?: string) {
  const user = await requirePermission(id ? 'master.items.edit' : 'master.items.create');
  const parsed = itemSchema.parse(data);
  await validateItemUnits(parsed.itemUnits);

  const baseUnit = parsed.itemUnits.find((u) => u.isBase)!;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const itemData = {
        code: parsed.code,
        nameAr: parsed.nameAr,
        nameEn: parsed.nameEn,
        barcode: parsed.barcode,
        description: parsed.description,
        categoryId: toOptionalId(parsed.categoryId),
        minStock: parsed.reorderLevelBaseQty ?? parsed.minStock,
        maxStock: parsed.maxStock,
        reorderLevelBaseQty: parsed.reorderLevelBaseQty ?? parsed.minStock,
        reorderQtyBase: parsed.reorderQtyBase,
        preferredSupplierId: toOptionalId(parsed.preferredSupplierId),
        enableReorderAlert: parsed.enableReorderAlert,
        isStockItem: parsed.isStockItem,
        isActive: parsed.isActive,
        unitId: baseUnit.unitId,
      };

      const item = id
        ? await tx.item.update({ where: { id }, data: itemData })
        : await tx.item.create({ data: itemData });

      if (id) {
        await tx.itemUnit.deleteMany({ where: { itemId: item.id } });
      }

      await tx.itemUnit.createMany({
        data: parsed.itemUnits.map((iu) => ({
          itemId: item.id,
          unitId: iu.unitId,
          isBase: iu.isBase,
          factorToBase: iu.isBase ? 1 : iu.factorToBase,
          barcode: iu.barcode,
          purchasePrice: iu.purchasePrice,
          salePrice: iu.salePrice,
          isDefaultPurchase: iu.isDefaultPurchase,
          isDefaultSale: iu.isDefaultSale,
          isActive: iu.isActive,
        })),
      });

      if (id) {
        await tx.itemWarehouseReorder.deleteMany({ where: { itemId: item.id } });
      }
      if (parsed.itemWarehouseReorders?.length) {
        await tx.itemWarehouseReorder.createMany({
          data: parsed.itemWarehouseReorders.map((wr) => ({
            itemId: item.id,
            warehouseId: wr.warehouseId,
            reorderLevelBaseQty: wr.reorderLevelBaseQty,
            reorderQtyBase: wr.reorderQtyBase,
            enableReorderAlert: wr.enableReorderAlert,
          })),
        });
      }

      return tx.item.findUnique({
        where: { id: item.id },
        include: {
          itemUnits: { include: { unit: true } },
          itemWarehouseReorders: { include: { warehouse: true } },
          preferredSupplier: true,
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: id ? 'UPDATE' : 'CREATE',
      entityType: 'ITEM',
      entityId: result!.id,
    });
    revalidateSettings();
    return result;
  } catch (e) {
    throw new Error(formatActionError(e));
  }
}

export async function setItemActive(id: string, isActive: boolean) {
  const user = await requirePermission(isActive ? 'master.items.activate' : 'master.items.deactivate');
  const result = await prisma.item.update({ where: { id }, data: { isActive } });
  await createAuditLog({ userId: user.id, action: 'UPDATE', entityType: 'ITEM', entityId: id });
  revalidateSettings();
  return result;
}

export async function deleteItem(id: string) {
  const user = await requirePermission('master.items.delete');
  const used = await prisma.purchaseRequestItem.count({ where: { itemId: id } });
  if (used > 0) throw new Error('لا يمكن حذف الصنف لأنه مستخدم في عمليات سابقة');

  await prisma.item.update({ where: { id }, data: { isActive: false } });
  await createAuditLog({ userId: user.id, action: 'DEACTIVATE', entityType: 'ITEM', entityId: id });
  revalidateSettings();
}

export async function getItemCategories() {
  return prisma.itemCategory.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
}
