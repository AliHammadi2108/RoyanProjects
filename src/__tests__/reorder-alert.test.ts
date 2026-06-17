import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  checkReorderPoint,
  getCurrentStockBaseQty,
  hasOpenReorderAlert,
  shouldNotify,
  getReorderSettings,
} from '@/services/reorder-alert.service';
import { applyStockOut } from '@/services/stock.service';

const prisma = new PrismaClient();

describe('reorder alert service', () => {
  let itemId: string;
  let warehouseId: string;
  const testCode = `REORDER-TEST-${Date.now()}`;

  beforeAll(async () => {
    const unit = await prisma.unit.findFirst();
    const warehouse = await prisma.warehouse.findFirst();
    if (!unit || !warehouse) throw new Error('Seed data required');

    warehouseId = warehouse.id;

    const item = await prisma.item.create({
      data: {
        code: testCode,
        nameAr: 'صنف اختبار حد الطلب',
        unitId: unit.id,
        reorderLevelBaseQty: 10,
        reorderQtyBase: 50,
        enableReorderAlert: true,
        isStockItem: true,
        itemUnits: {
          create: {
            unitId: unit.id,
            isBase: true,
            factorToBase: 1,
            isDefaultPurchase: true,
            isActive: true,
          },
        },
        stockBalances: {
          create: { warehouseId, baseQty: 20 },
        },
      },
    });
    itemId = item.id;
  });

  afterAll(async () => {
    await prisma.reorderAlert.deleteMany({ where: { itemId } });
    await prisma.stockMovement.deleteMany({ where: { itemId } });
    await prisma.stockBalance.deleteMany({ where: { itemId } });
    await prisma.itemUnit.deleteMany({ where: { itemId } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.$disconnect();
  });

  it('reads current stock in base qty', async () => {
    const qty = await getCurrentStockBaseQty(itemId, warehouseId);
    expect(qty).toBe(20);
  });

  it('triggers alert when stock falls to reorder level', async () => {
    await prisma.$transaction(async (tx) => {
      await applyStockOut(tx, {
        warehouseId,
        itemId,
        qty: 11,
        factorToBase: 1,
        movementType: 'TEST_OUT',
      });
    });

    const open = await hasOpenReorderAlert(itemId, warehouseId);
    expect(open).toBe(true);

    const stock = await getCurrentStockBaseQty(itemId, warehouseId);
    expect(stock).toBe(9);
  });

  it('does not duplicate alerts for same item/warehouse', async () => {
    const duplicate = await checkReorderPoint(itemId, warehouseId);
    expect(duplicate.alerted).toBe(false);

    const count = await prisma.reorderAlert.count({
      where: { itemId, warehouseId, status: 'open' },
    });
    expect(count).toBe(1);
  });

  it('closes alert when stock rises above reorder level', async () => {
    await prisma.stockBalance.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { baseQty: 15 },
    });

    const result = await checkReorderPoint(itemId, warehouseId);
    expect(result.closed).toBe(true);

    const open = await hasOpenReorderAlert(itemId, warehouseId);
    expect(open).toBe(false);
  });

  it('shouldNotify returns false when alert already open', async () => {
    await prisma.reorderAlert.create({
      data: {
        itemId,
        warehouseId,
        status: 'open',
        currentStockBaseQty: 5,
        reorderLevelBaseQty: 10,
        notificationSent: true,
      },
    });

    const settings = await getReorderSettings(itemId, warehouseId);
    expect(settings).not.toBeNull();

    const notify = await shouldNotify(itemId, warehouseId, 5, settings!);
    expect(notify).toBe(false);

    await prisma.reorderAlert.deleteMany({ where: { itemId, status: 'open' } });
  });
});

describe('reorder alert routes', () => {
  it('maps reorder alerts report path', async () => {
    const { getScreenPermissionForPath } = await import('@/lib/screen-access');
    expect(getScreenPermissionForPath('/reports/reorder-alerts')).toBe(
      'inventory.reorder_alerts.view'
    );
  });
});
