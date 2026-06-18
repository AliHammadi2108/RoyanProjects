'use server';

import { requirePermission } from '@/lib/permissions';
import { getPurchaseDashboardData } from '@/services/purchase-dashboard.service';

export async function fetchPurchaseDashboard() {
  await requirePermission('tracking.view');
  return getPurchaseDashboardData();
}
