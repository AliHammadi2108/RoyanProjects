import { hasPermission, isAdmin } from '@/lib/permissions';

/** Every navigable screen and the permission required to view it. */
export const SCREEN_NAV_ITEMS = [
  { href: '/purchases/tracking', permission: 'tracking.view', group: 'operations' },
  { href: '/purchases/requests', permission: 'purchase_requests.view', group: 'operations' },
  { href: '/purchases/quotations', permission: 'quotations.view', group: 'operations' },
  { href: '/purchases/comparisons', permission: 'comparisons.view', group: 'operations' },
  { href: '/purchases/supplier-selection', permission: 'supplier_selection.view', group: 'operations' },
  { href: '/purchases/orders', permission: 'purchase_orders.view', group: 'operations' },
  { href: '/purchases/inspections', permission: 'inspections.view', group: 'operations' },
  { href: '/purchases/receivings', permission: 'receivings.view', group: 'operations' },
  { href: '/purchases/invoices', permission: 'invoices.view', group: 'operations' },
  { href: '/purchases/supplier-payments', permission: 'supplier_payment.view', group: 'operations' },
  { href: '/approvals/inbox', permission: 'approvals.view', group: 'operations' },
  { href: '/notifications', permission: 'notifications.view', group: 'operations' },
  { href: '/reports/operations', permission: 'reports.operations.view', group: 'reports' },
  { href: '/reports/quantity-cost', permission: 'reports.quantity_cost.view', group: 'reports' },
  { href: '/reports/supplier-balances', permission: 'reports.supplier_debt.view', group: 'reports' },
  { href: '/reports/supplier-statement', permission: 'reports.supplier_statement.view', group: 'reports' },
  { href: '/reports/approvals', permission: 'reports.approvals.view', group: 'reports' },
  { href: '/reports/used-documents', permission: 'reports.used_documents.view', group: 'reports' },
  { href: '/reports/reorder-alerts', permission: 'inventory.reorder_alerts.view', group: 'reports' },
  { href: '/settings/currencies', permission: 'master.currencies.view', group: 'master-data' },
  { href: '/settings/suppliers', permission: 'master.suppliers.view', group: 'master-data' },
  { href: '/settings/units', permission: 'master.units.view', group: 'master-data' },
  { href: '/settings/items', permission: 'master.items.view', group: 'master-data' },
  { href: '/settings/roles', permission: 'access.roles.view', group: 'administration' },
  { href: '/settings/users', permission: 'access.users.view', group: 'administration' },
  { href: '/settings/user-permissions', permission: 'access.users.view', group: 'administration' },
  { href: '/settings/supplier-permissions', permission: 'access.supplier_permissions.view', group: 'administration' },
  { href: '/settings/approval-rules', permission: 'access.approval_rules.view', group: 'administration' },
  { href: '/settings/approval-requests', permission: 'access.approval_requests.view', group: 'administration' },
  { href: '/settings/approval-matrix', permission: 'approvals.view', group: 'administration' },
] as const;

const ROUTE_PERMISSIONS = [...SCREEN_NAV_ITEMS]
  .map(({ href, permission }) => ({ pathPrefix: href, permission }))
  .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);

/** Resolve the view permission required for a URL path. */
export function getScreenPermissionForPath(pathname: string): string | null {
  const normalized = pathname.split('?')[0];
  for (const route of ROUTE_PERMISSIONS) {
    if (normalized === route.pathPrefix || normalized.startsWith(`${route.pathPrefix}/`)) {
      return route.permission;
    }
  }
  return null;
}

export async function canAccessPath(userId: string, pathname: string): Promise<boolean> {
  const permission = getScreenPermissionForPath(pathname);
  if (!permission) return true;
  return hasPermission(userId, permission);
}

export async function getAccessibleHrefs(userId: string): Promise<string[]> {
  if (await isAdmin(userId)) {
    return SCREEN_NAV_ITEMS.map((item) => item.href);
  }

  const hrefs: string[] = [];
  for (const item of SCREEN_NAV_ITEMS) {
    if (await hasPermission(userId, item.permission)) {
      hrefs.push(item.href);
    }
  }
  return hrefs;
}

/** First screen the user may open (sidebar order). */
export async function getDefaultScreenHref(userId: string): Promise<string> {
  const hrefs = await getAccessibleHrefs(userId);
  return hrefs[0] ?? '/unauthorized';
}
