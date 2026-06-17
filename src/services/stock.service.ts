import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { calcBaseQty } from '@/lib/item-units';

type Tx = Prisma.TransactionClient;

export async function applyStockIn(
  tx: Tx,
  params: {
    warehouseId: string;
    itemId: string;
    itemUnitId?: string;
    unitId?: string;
    qty: number;
    factorToBase: number;
    movementType: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }
) {
  const baseQty = calcBaseQty(params.qty, params.factorToBase);

  await tx.stockMovement.create({
    data: {
      warehouseId: params.warehouseId,
      itemId: params.itemId,
      itemUnitId: params.itemUnitId,
      unitId: params.unitId,
      qty: params.qty,
      factorToBase: params.factorToBase,
      baseQty,
      movementType: params.movementType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      notes: params.notes,
      createdBy: params.createdBy,
    },
  });

  await tx.stockBalance.upsert({
    where: {
      warehouseId_itemId: { warehouseId: params.warehouseId, itemId: params.itemId },
    },
    create: {
      warehouseId: params.warehouseId,
      itemId: params.itemId,
      baseQty,
    },
    update: {
      baseQty: { increment: baseQty },
    },
  });

  return baseQty;
}

export async function applyStockOut(
  tx: Tx,
  params: {
    warehouseId: string;
    itemId: string;
    itemUnitId?: string;
    unitId?: string;
    qty: number;
    factorToBase: number;
    movementType: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }
) {
  const baseQty = calcBaseQty(params.qty, params.factorToBase);

  const balance = await tx.stockBalance.findUnique({
    where: {
      warehouseId_itemId: { warehouseId: params.warehouseId, itemId: params.itemId },
    },
  });

  const available = balance?.baseQty ?? 0;
  if (available < baseQty) {
    throw new Error('الكمية المطلوبة تتجاوز رصيد المخزون');
  }

  await tx.stockMovement.create({
    data: {
      warehouseId: params.warehouseId,
      itemId: params.itemId,
      itemUnitId: params.itemUnitId,
      unitId: params.unitId,
      qty: -params.qty,
      factorToBase: params.factorToBase,
      baseQty: -baseQty,
      movementType: params.movementType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      notes: params.notes,
      createdBy: params.createdBy,
    },
  });

  await tx.stockBalance.update({
    where: {
      warehouseId_itemId: { warehouseId: params.warehouseId, itemId: params.itemId },
    },
    data: { baseQty: { decrement: baseQty } },
  });

  return baseQty;
}

export async function getStockBalance(warehouseId: string, itemId: string) {
  const row = await prisma.stockBalance.findUnique({
    where: { warehouseId_itemId: { warehouseId, itemId } },
  });
  return row?.baseQty ?? 0;
}
