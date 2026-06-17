'use server';

import { requirePermission, hasPermission, requireAuth } from '@/lib/permissions';
import {
  getReorderAlertsReport,
  buildBulkPrRoutesBySupplier,
} from '@/services/reorder-alert.service';
import { prisma } from '@/lib/db';

export async function fetchReorderAlertsReport(filters: unknown) {
  const user = await requirePermission('inventory.reorder_alerts.view');
  return getReorderAlertsReport(user.id, filters);
}

export async function canCreatePrFromReorderAlert() {
  const user = await requireAuth();
  return hasPermission(user.id, 'inventory.reorder_alerts.create_purchase_request');
}

export async function canExportReorderAlerts() {
  const user = await requireAuth();
  return hasPermission(user.id, 'inventory.reorder_alerts.export');
}

export async function canPrintReorderAlerts() {
  const user = await requireAuth();
  return hasPermission(user.id, 'inventory.reorder_alerts.print');
}

export async function canEditReorderSettings() {
  const user = await requireAuth();
  return hasPermission(user.id, 'inventory.reorder_settings.edit');
}

export async function fetchBulkPrRoutesFromAlerts(filters: unknown) {
  await requirePermission('inventory.reorder_alerts.create_purchase_request');
  const report = await getReorderAlertsReport('system', {
    ...(typeof filters === 'object' && filters ? filters : {}),
    alertStatus: 'open',
    pageSize: 200,
  });
  return buildBulkPrRoutesBySupplier(report.rows);
}

export async function fetchReorderAlertFilterOptions() {
  await requirePermission('inventory.reorder_alerts.view');
  const [warehouses, suppliers] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true },
      orderBy: { nameAr: 'asc' },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameAr: true },
      orderBy: { nameAr: 'asc' },
    }),
  ]);
  return { warehouses, suppliers };
}
