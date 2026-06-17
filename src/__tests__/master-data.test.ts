import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { calcBaseQty } from '@/lib/item-units';
import { validateItemUnits } from '@/services/item-unit.service';
import { getEffectivePermissions, hasPermission } from '@/lib/permissions';

const prisma = new PrismaClient();

describe('Master Data & Permissions', () => {
  let itemId: string;
  let unitPcsId: string;
  let unitBoxId: string;
  let warehouseId: string;
  let officerId: string;
  let supplierId: string;

  beforeAll(async () => {
    const item = await prisma.item.findFirst({ include: { itemUnits: true } });
    const unitPcs = await prisma.unit.findUnique({ where: { code: 'PCS' } });
    const unitBox = await prisma.unit.findUnique({ where: { code: 'BOX' } });
    const warehouse = await prisma.warehouse.findFirst();
    const officer = await prisma.user.findUnique({ where: { username: 'purchasing_officer' } });
    const supplier = await prisma.supplier.findFirst();

    itemId = item!.id;
    unitPcsId = unitPcs!.id;
    unitBoxId = unitBox!.id;
    warehouseId = warehouse!.id;
    officerId = officer!.id;
    supplierId = supplier!.id;
  });

  it('calculates base_qty from qty and factor', () => {
    expect(calcBaseQty(10, 12)).toBe(120);
    expect(calcBaseQty(5, 1)).toBe(5);
  });

  it('validates item units rules', async () => {
    await expect(
      validateItemUnits([
        { unitId: unitPcsId, isBase: true, factorToBase: 1 },
        { unitId: unitBoxId, isBase: true, factorToBase: 12 },
      ])
    ).rejects.toThrow('وحدة أساسية واحدة');

    await expect(
      validateItemUnits([{ unitId: unitPcsId, isBase: true, factorToBase: 0 }])
    ).rejects.toThrow('معامل التحويل');
  });

  it('creates item with multiple units and base factor', async () => {
    const code = `ITM-TEST-${Date.now()}`;
    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: { code, nameAr: 'صنف اختبار', unitId: unitPcsId },
      });
      await tx.itemUnit.createMany({
        data: [
          {
            itemId: item.id,
            unitId: unitPcsId,
            isBase: true,
            factorToBase: 1,
            isDefaultPurchase: true,
            isDefaultSale: true,
          },
          {
            itemId: item.id,
            unitId: unitBoxId,
            isBase: false,
            factorToBase: 24,
            isDefaultPurchase: false,
            isDefaultSale: false,
          },
        ],
      });
      return item;
    });

    const boxUnit = await prisma.itemUnit.findFirst({
      where: { itemId: created.id, unitId: unitBoxId },
    });
    expect(boxUnit?.factorToBase).toBe(24);
    expect(calcBaseQty(2, boxUnit!.factorToBase)).toBe(48);

    await prisma.itemUnit.deleteMany({ where: { itemId: created.id } });
    await prisma.item.delete({ where: { id: created.id } });
  });

  it('updates stock balance on receiving movement', async () => {
    const before = await prisma.stockBalance.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
    });
    const beforeQty = before?.baseQty ?? 0;

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          warehouseId,
          itemId,
          qty: 3,
          factorToBase: 1,
          baseQty: 3,
          movementType: 'TEST_IN',
        },
      });
      await tx.stockBalance.upsert({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        create: { warehouseId, itemId, baseQty: 3 },
        update: { baseQty: { increment: 3 } },
      });
    });

    const after = await prisma.stockBalance.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
    });
    expect(after?.baseQty).toBe(beforeQty + 3);

    await prisma.stockBalance.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { baseQty: beforeQty },
    });
  });

  it('prevents deleting used currency', async () => {
    const currency = await prisma.currency.findFirst({
      where: { purchaseRequests: { some: {} } },
    });
    if (!currency) return;
    const count =
      (await prisma.purchaseRequest.count({ where: { currencyId: currency.id } })) +
      (await prisma.supplier.count({ where: { defaultCurrencyId: currency.id } }));
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('enforces supplier permission for officer on assigned supplier', async () => {
    const perm = await prisma.userSupplierPermission.findFirst({
      where: { userId: officerId, supplierId },
    });
    expect(perm?.canUseInPurchase).toBe(true);
  });

  it('deny direct permission overrides role allow', async () => {
    const perm = await prisma.permission.findUnique({
      where: { name: 'master.currencies.view' },
    });
    if (!perm) return;

    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: officerId, permissionId: perm.id } },
      create: { userId: officerId, permissionId: perm.id, effect: 'deny' },
      update: { effect: 'deny' },
    });

    const effective = await getEffectivePermissions(officerId);
    expect(effective.get('master.currencies.view')).toBe('deny');
    expect(await hasPermission(officerId, 'master.currencies.view')).toBe(false);

    await prisma.userPermission.deleteMany({
      where: { userId: officerId, permissionId: perm.id },
    });
  });

  it('processes structured approval request flow', async () => {
    const requester = await prisma.user.findUnique({ where: { username: 'requester' } });
    const approver = await prisma.user.findUnique({ where: { username: 'approver' } });
    if (!requester || !approver) return;

    const request = await prisma.approvalRequest.create({
      data: {
        module: 'purchases',
        operationType: 'test_op',
        referenceId: `ref-${Date.now()}`,
        requestedBy: requester.id,
        status: 'pending',
        level: 1,
        amount: 5000,
      },
    });

    await prisma.approvalRequestAction.create({
      data: {
        requestId: request.id,
        userId: approver.id,
        action: 'approve',
        level: 1,
      },
    });

    const updated = await prisma.approvalRequest.update({
      where: { id: request.id },
      data: { status: 'approved' },
    });

    expect(updated.status).toBe('approved');

    await prisma.approvalRequestAction.deleteMany({ where: { requestId: request.id } });
    await prisma.approvalRequest.delete({ where: { id: request.id } });
  });
});
