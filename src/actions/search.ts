'use server';

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/permissions';
import { getAllowedSupplierIds, supplierWhereForUser } from '@/services/supplier-access.service';
import { getStockBalance } from '@/services/stock.service';

const DEFAULT_LIMIT = 20;

function buildTextSearch(query: string, fields: string[]) {
  const q = query.trim();
  if (!q) return {};
  return { OR: fields.map((field) => ({ [field]: { contains: q } })) };
}

export interface SearchItemResult {
  id: string;
  code: string;
  nameAr: string;
  barcode?: string | null;
  stockBalance?: number | null;
  baseUnitName?: string | null;
  itemUnits: Array<{
    id: string;
    unitId: string;
    factorToBase: number;
    isDefaultPurchase: boolean;
    isDefaultSale: boolean;
    isBase: boolean;
    unit?: { nameAr: string; symbol?: string | null };
  }>;
}

export async function searchItems(
  query: string,
  options?: { warehouseId?: string; limit?: number }
): Promise<SearchItemResult[]> {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const q = query.trim();

  const items = await prisma.item.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { nameAr: { contains: q } },
              { barcode: { contains: q } },
              {
                itemUnits: {
                  some: { isActive: true, barcode: { contains: q } },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      itemUnits: {
        where: { isActive: true },
        include: { unit: true },
        orderBy: { isBase: 'desc' },
      },
    },
    orderBy: { code: 'asc' },
    take: limit,
  });

  const results: SearchItemResult[] = [];
  for (const item of items) {
    const baseUnit = item.itemUnits.find((u) => u.isBase);
    let stockBalance: number | null = null;
    if (options?.warehouseId) {
      stockBalance = await getStockBalance(options.warehouseId, item.id);
    }
    results.push({
      id: item.id,
      code: item.code,
      nameAr: item.nameAr,
      barcode: item.barcode,
      stockBalance,
      baseUnitName: baseUnit?.unit?.nameAr ?? null,
      itemUnits: item.itemUnits.map((iu) => ({
        id: iu.id,
        unitId: iu.unitId,
        factorToBase: iu.factorToBase,
        isDefaultPurchase: iu.isDefaultPurchase,
        isDefaultSale: iu.isDefaultSale,
        isBase: iu.isBase,
        unit: iu.unit ? { nameAr: iu.unit.nameAr, symbol: iu.unit.symbol } : undefined,
      })),
    });
  }
  return results;
}

export async function searchSuppliers(query: string, options?: { limit?: number }) {
  const user = await requireAuth();
  const allowedSupplierIds = await getAllowedSupplierIds(user.id, 'use_in_purchase');
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return prisma.supplier.findMany({
    where: {
      ...supplierWhereForUser(allowedSupplierIds, { isActive: true }),
      ...buildTextSearch(query, ['code', 'nameAr', 'phone', 'email', 'taxNo']),
    },
    select: { id: true, code: true, nameAr: true, phone: true, defaultCurrencyId: true },
    orderBy: { code: 'asc' },
    take: limit,
  });
}

export async function searchCurrencies(query: string, options?: { activeOnly?: boolean; limit?: number }) {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return prisma.currency.findMany({
    where: {
      ...(options?.activeOnly !== false ? { isActive: true } : {}),
      ...buildTextSearch(query, ['code', 'nameAr', 'symbol']),
    },
    select: { id: true, code: true, nameAr: true, symbol: true, rateToBase: true, isBase: true },
    orderBy: [{ isBase: 'desc' }, { code: 'asc' }],
    take: limit,
  });
}

export async function searchUnits(query: string, options?: { activeOnly?: boolean; limit?: number }) {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return prisma.unit.findMany({
    where: {
      ...(options?.activeOnly !== false ? { isActive: true } : {}),
      ...buildTextSearch(query, ['code', 'nameAr', 'symbol']),
    },
    select: { id: true, code: true, nameAr: true, symbol: true },
    orderBy: { code: 'asc' },
    take: limit,
  });
}

export async function searchWarehouses(query: string, options?: { limit?: number }) {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return prisma.warehouse.findMany({
    where: {
      isActive: true,
      ...buildTextSearch(query, ['code', 'nameAr']),
    },
    select: { id: true, code: true, nameAr: true, branchId: true },
    orderBy: { code: 'asc' },
    take: limit,
  });
}

export async function searchBranches(query: string, options?: { limit?: number }) {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return prisma.branch.findMany({
    where: {
      isActive: true,
      ...buildTextSearch(query, ['code', 'nameAr']),
    },
    select: { id: true, code: true, nameAr: true },
    orderBy: { code: 'asc' },
    take: limit,
  });
}

export async function searchDepartments(
  query: string,
  branchId?: string,
  options?: { limit?: number }
) {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;

  return prisma.department.findMany({
    where: {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...buildTextSearch(query, ['code', 'nameAr']),
    },
    select: { id: true, code: true, nameAr: true, branchId: true },
    orderBy: { code: 'asc' },
    take: limit,
  });
}

export async function searchUsers(query: string, options?: { limit?: number }) {
  await requireAuth();
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const q = query.trim();

  return prisma.user.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              { userNo: { contains: q } },
              { nameAr: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
              { username: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      userNo: true,
      nameAr: true,
      phone: true,
      email: true,
    },
    orderBy: { userNo: 'asc' },
    take: limit,
  });
}
