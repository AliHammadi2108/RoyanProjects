import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { createNotification } from '@/services/notification.service';
import { getAdminUserIds } from '@/lib/permissions';
import { parseReportFilters, paginateSlice, sortRows } from '@/services/reports/filters';
import type { ReportResult } from '@/services/reports/types';

type Tx = Prisma.TransactionClient;

const OPEN_PR_STATUSES = ['Draft', 'Pending Approval'];

export interface ReorderSettings {
  reorderLevelBaseQty: number | null;
  reorderQtyBase: number | null;
  enableReorderAlert: boolean;
  preferredSupplierId: string | null;
}

export interface ReorderAlertRow {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string | null;
  warehouseName: string | null;
  currentStockBaseQty: number;
  reorderLevelBaseQty: number;
  reorderQtyBase: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  baseUnitName: string | null;
  status: string;
  notifiedAt: string;
  closedAt: string | null;
  prRoute: string;
}

export async function getCurrentStockBaseQty(
  itemId: string,
  warehouseId?: string | null,
  tx: Tx | typeof prisma = prisma
): Promise<number> {
  if (warehouseId) {
    const balance = await tx.stockBalance.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
    });
    return balance?.baseQty ?? 0;
  }

  const agg = await tx.stockBalance.aggregate({
    where: { itemId },
    _sum: { baseQty: true },
  });
  return agg._sum.baseQty ?? 0;
}

export async function getReorderSettings(
  itemId: string,
  warehouseId?: string | null,
  tx: Tx | typeof prisma = prisma
): Promise<ReorderSettings | null> {
  const item = await tx.item.findUnique({
    where: { id: itemId },
    select: {
      reorderLevelBaseQty: true,
      reorderQtyBase: true,
      minStock: true,
      enableReorderAlert: true,
      preferredSupplierId: true,
      isStockItem: true,
      isActive: true,
    },
  });

  if (!item || !item.isActive || !item.isStockItem) return null;

  if (warehouseId) {
    const whSettings = await tx.itemWarehouseReorder.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId } },
    });
    if (whSettings?.enableReorderAlert) {
      return {
        reorderLevelBaseQty: whSettings.reorderLevelBaseQty ?? item.reorderLevelBaseQty ?? item.minStock ?? null,
        reorderQtyBase: whSettings.reorderQtyBase ?? item.reorderQtyBase ?? null,
        enableReorderAlert: true,
        preferredSupplierId: item.preferredSupplierId,
      };
    }
  }

  const level = item.reorderLevelBaseQty ?? item.minStock ?? null;
  if (!item.enableReorderAlert || level == null) return null;

  return {
    reorderLevelBaseQty: level,
    reorderQtyBase: item.reorderQtyBase ?? null,
    enableReorderAlert: item.enableReorderAlert,
    preferredSupplierId: item.preferredSupplierId,
  };
}

export async function hasOpenPurchaseRequestForItem(
  itemId: string,
  tx: Tx | typeof prisma = prisma
): Promise<boolean> {
  const row = await tx.purchaseRequestItem.findFirst({
    where: {
      itemId,
      purchaseRequest: { status: { in: OPEN_PR_STATUSES } },
    },
    select: { id: true },
  });
  return !!row;
}

export async function hasOpenReorderAlert(
  itemId: string,
  warehouseId?: string | null,
  tx: Tx | typeof prisma = prisma
): Promise<boolean> {
  const alert = await tx.reorderAlert.findFirst({
    where: {
      itemId,
      warehouseId: warehouseId ?? null,
      status: 'open',
    },
  });
  return !!alert;
}

export async function shouldNotify(
  itemId: string,
  warehouseId: string | null | undefined,
  stockBaseQty: number,
  settings: ReorderSettings,
  tx: Tx | typeof prisma = prisma
): Promise<boolean> {
  if (!settings.enableReorderAlert) return false;
  if (settings.reorderLevelBaseQty == null) return false;
  if (stockBaseQty > settings.reorderLevelBaseQty) return false;
  if (await hasOpenReorderAlert(itemId, warehouseId, tx)) return false;
  if (await hasOpenPurchaseRequestForItem(itemId, tx)) return false;
  return true;
}

export async function closeAlert(
  itemId: string,
  warehouseId?: string | null,
  tx: Tx | typeof prisma = prisma
): Promise<void> {
  await tx.reorderAlert.updateMany({
    where: {
      itemId,
      warehouseId: warehouseId ?? null,
      status: 'open',
    },
    data: {
      status: 'closed',
      closedAt: new Date(),
    },
  });
}

async function getUserIdsWithPermission(permission: string): Promise<string[]> {
  const adminIds = await getAdminUserIds();
  const permissionRow = await prisma.permission.findUnique({ where: { name: permission } });
  if (!permissionRow) return adminIds;

  const userIds = new Set<string>(adminIds);

  const rolePerms = await prisma.rolePermission.findMany({
    where: { permissionId: permissionRow.id, role: { isActive: true } },
    include: { role: { include: { users: { where: { user: { isActive: true } } } } } },
  });
  for (const rp of rolePerms) {
    for (const ur of rp.role.users) userIds.add(ur.userId);
  }

  const direct = await prisma.userPermission.findMany({
    where: { permissionId: permissionRow.id, effect: 'allow', user: { isActive: true } },
    select: { userId: true },
  });
  for (const d of direct) userIds.add(d.userId);

  const denied = await prisma.userPermission.findMany({
    where: { permissionId: permissionRow.id, effect: 'deny' },
    select: { userId: true },
  });
  const deniedSet = new Set(denied.map((d) => d.userId));
  return Array.from(userIds).filter((id) => !deniedSet.has(id));
}

function buildPrRoute(itemId: string, supplierId: string | null, qty: number | null): string {
  const params = new URLSearchParams({ itemId });
  if (supplierId) params.set('supplierId', supplierId);
  if (qty != null && qty > 0) params.set('qty', String(qty));
  return `/purchases/requests/new?${params.toString()}`;
}

async function notifyReorderAlert(
  item: { id: string; code: string; nameAr: string },
  warehouseId: string | null,
  stockBaseQty: number,
  settings: ReorderSettings
): Promise<void> {
  const userIds = await getUserIdsWithPermission('inventory.reorder_alerts.view');
  const wh = warehouseId
    ? await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { nameAr: true } })
    : null;
  const whLabel = wh ? ` في مخزن ${wh.nameAr}` : '';
  const title = `تنبيه حد الطلب: ${item.code}`;
  const message = `الصنف ${item.nameAr} وصل حد الطلب${whLabel} — الرصيد ${stockBaseQty} والحد ${settings.reorderLevelBaseQty}`;
  const reportRoute = `/reports/reorder-alerts?itemId=${item.id}${warehouseId ? `&warehouseId=${warehouseId}` : ''}`;

  for (const userId of userIds) {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.REORDER_ALERT,
      title,
      message,
      relatedModule: 'inventory',
      relatedDocumentType: 'REORDER_ALERT',
      relatedDocumentId: item.id,
      route: reportRoute,
      priority: 'High',
    });
  }
}

export async function checkReorderPoint(
  itemId: string,
  warehouseId?: string | null,
  tx: Tx | typeof prisma = prisma
): Promise<{ alerted: boolean; closed: boolean }> {
  const settings = await getReorderSettings(itemId, warehouseId, tx);
  const stockBaseQty = await getCurrentStockBaseQty(itemId, warehouseId, tx);

  if (!settings || settings.reorderLevelBaseQty == null) {
    return { alerted: false, closed: false };
  }

  if (stockBaseQty > settings.reorderLevelBaseQty) {
    const hadOpen = await hasOpenReorderAlert(itemId, warehouseId, tx);
    if (hadOpen) {
      await closeAlert(itemId, warehouseId, tx);
    }
    return { alerted: false, closed: hadOpen };
  }

  const notify = await shouldNotify(itemId, warehouseId, stockBaseQty, settings, tx);
  if (!notify) return { alerted: false, closed: false };

  const item = await tx.item.findUnique({
    where: { id: itemId },
    select: { id: true, code: true, nameAr: true },
  });
  if (!item) return { alerted: false, closed: false };

  await tx.reorderAlert.create({
    data: {
      itemId,
      warehouseId: warehouseId ?? null,
      status: 'open',
      currentStockBaseQty: stockBaseQty,
      reorderLevelBaseQty: settings.reorderLevelBaseQty,
      reorderQtyBase: settings.reorderQtyBase,
    },
  });

  await tx.item.update({
    where: { id: itemId },
    data: { lastReorderAlertAt: new Date() },
  });

  if (tx === prisma) {
    await notifyReorderAlert(item, warehouseId ?? null, stockBaseQty, settings);
    await tx.reorderAlert.updateMany({
      where: { itemId, warehouseId: warehouseId ?? null, status: 'open', notificationSent: false },
      data: { notificationSent: true },
    });
  }

  return { alerted: true, closed: false };
}

export async function flushPendingReorderNotifications(): Promise<void> {
  const pending = await prisma.reorderAlert.findMany({
    where: { status: 'open', notificationSent: false },
    include: {
      item: { select: { id: true, code: true, nameAr: true, preferredSupplierId: true, reorderQtyBase: true } },
    },
    take: 50,
  });

  for (const alert of pending) {
    const settings: ReorderSettings = {
      reorderLevelBaseQty: alert.reorderLevelBaseQty,
      reorderQtyBase: alert.reorderQtyBase ?? alert.item.reorderQtyBase,
      enableReorderAlert: true,
      preferredSupplierId: alert.item.preferredSupplierId,
    };
    await notifyReorderAlert(
      alert.item,
      alert.warehouseId,
      alert.currentStockBaseQty ?? 0,
      settings
    );
    await prisma.reorderAlert.update({
      where: { id: alert.id },
      data: { notificationSent: true },
    });
  }
}

export async function checkAllAfterStockChange(
  tx: Tx,
  params: { itemId: string; warehouseId: string }
): Promise<void> {
  await checkReorderPoint(params.itemId, params.warehouseId, tx);
  await checkReorderPoint(params.itemId, null, tx);
}

export async function getReorderAlertsReport(
  _userId: string,
  filtersInput: unknown
): Promise<ReportResult<ReorderAlertRow>> {
  const filters = parseReportFilters(filtersInput);
  const statusFilter =
    (filtersInput as { alertStatus?: string })?.alertStatus === 'closed'
      ? 'closed'
      : (filtersInput as { alertStatus?: string })?.alertStatus === 'all'
        ? undefined
        : 'open';

  const where: Prisma.ReorderAlertWhereInput = {
    ...(statusFilter && { status: statusFilter }),
    ...(filters.itemId && { itemId: filters.itemId }),
    ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    ...(filters.search && {
      OR: [
        { item: { code: { contains: filters.search } } },
        { item: { nameAr: { contains: filters.search } } },
      ],
    }),
  };

  const alerts = await prisma.reorderAlert.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          code: true,
          nameAr: true,
          preferredSupplierId: true,
          reorderQtyBase: true,
          preferredSupplier: { select: { id: true, nameAr: true } },
          itemUnits: {
            where: { isBase: true },
            include: { unit: { select: { nameAr: true } } },
            take: 1,
          },
        },
      },
      warehouse: { select: { id: true, nameAr: true } },
    },
    orderBy: { notifiedAt: 'desc' },
  });

  let rows: ReorderAlertRow[] = await Promise.all(
    alerts.map(async (a) => {
      const stock = await getCurrentStockBaseQty(a.itemId, a.warehouseId);
      const supplier = a.item.preferredSupplier;
      const qty = a.reorderQtyBase ?? a.item.reorderQtyBase ?? 0;
      return {
        id: a.id,
        itemId: a.itemId,
        itemCode: a.item.code,
        itemName: a.item.nameAr,
        warehouseId: a.warehouseId,
        warehouseName: a.warehouse?.nameAr ?? null,
        currentStockBaseQty: stock,
        reorderLevelBaseQty: a.reorderLevelBaseQty ?? 0,
        reorderQtyBase: qty,
        preferredSupplierId: supplier?.id ?? a.item.preferredSupplierId,
        preferredSupplierName: supplier?.nameAr ?? null,
        baseUnitName: a.item.itemUnits[0]?.unit?.nameAr ?? null,
        status: a.status,
        notifiedAt: a.notifiedAt.toISOString(),
        closedAt: a.closedAt?.toISOString() ?? null,
        prRoute: buildPrRoute(
          a.itemId,
          supplier?.id ?? a.item.preferredSupplierId,
          qty
        ),
      };
    })
  );

  if ((filtersInput as { supplierId?: string })?.supplierId) {
    const sid = (filtersInput as { supplierId: string }).supplierId;
    rows = rows.filter((r) => r.preferredSupplierId === sid);
  }

  const sortBy = filters.sortBy || 'notifiedAt';
  rows = sortRows(rows, sortBy, filters.sortDir);
  const total = rows.length;
  rows = paginateSlice(rows, filters.page, filters.pageSize);

  const chartData = [
    { label: 'مفتوحة', value: alerts.filter((a) => a.status === 'open').length },
    { label: 'مغلقة', value: alerts.filter((a) => a.status === 'closed').length },
  ];

  return {
    rows,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      alertCount: total,
      openCount: alerts.filter((a) => a.status === 'open').length,
      itemCount: new Set(alerts.map((a) => a.itemId)).size,
    },
    chartData,
  };
}

export function buildBulkPrRoutesBySupplier(
  rows: ReorderAlertRow[]
): Array<{ supplierId: string; supplierName: string; route: string; itemCount: number }> {
  const bySupplier = new Map<string, { supplierName: string; items: ReorderAlertRow[] }>();
  for (const row of rows) {
    if (!row.preferredSupplierId) continue;
    const key = row.preferredSupplierId;
    const existing = bySupplier.get(key);
    if (existing) {
      existing.items.push(row);
    } else {
      bySupplier.set(key, {
        supplierName: row.preferredSupplierName || key,
        items: [row],
      });
    }
  }

  return Array.from(bySupplier.entries()).map(([supplierId, { supplierName, items }]) => {
    const first = items[0];
    const params = new URLSearchParams({ supplierId });
    if (items.length === 1) {
      params.set('itemId', first.itemId);
      if (first.reorderQtyBase > 0) params.set('qty', String(first.reorderQtyBase));
    } else {
      params.set('itemIds', items.map((i: ReorderAlertRow) => i.itemId).join(','));
    }
    return {
      supplierId,
      supplierName,
      route: `/purchases/requests/new?${params.toString()}`,
      itemCount: items.length,
    };
  });
}
