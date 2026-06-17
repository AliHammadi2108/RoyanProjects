'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  GitCompare,
  UserCheck,
  ShoppingCart,
  ClipboardCheck,
  Package,
  FileSpreadsheet,
  Activity,
  Inbox,
  Bell,
  Settings,
  LogOut,
  Coins,
  Truck,
  Ruler,
  Boxes,
  Shield,
  Users,
  FileKey,
  ClipboardList,
  ChevronDown,
  Database,
  Cog,
  Workflow,
  BarChart3,
  Lock,
  Scale,
  FileCheck,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { CurrentUserDisplay } from '@/components/layout/CurrentUserDisplay';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'notifications';
};

type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: 'operations',
    label: 'عمليات',
    icon: Workflow,
    items: [
      { href: '/purchases/tracking', label: 'متابعة العمليات', icon: Activity },
      { href: '/purchases/requests', label: 'طلبات الشراء', icon: FileText },
      { href: '/purchases/quotations', label: 'عروض الأسعار', icon: Receipt },
      { href: '/purchases/comparisons', label: 'المقارنة الفنية', icon: GitCompare },
      { href: '/purchases/supplier-selection', label: 'اختيار المورد', icon: UserCheck },
      { href: '/purchases/orders', label: 'أوامر الشراء', icon: ShoppingCart },
      { href: '/purchases/inspections', label: 'فحص المشتريات', icon: ClipboardCheck },
      { href: '/purchases/receivings', label: 'إذن التوريد', icon: Package },
      { href: '/purchases/invoices', label: 'فواتير المشتريات', icon: FileSpreadsheet },
      { href: '/purchases/supplier-payments', label: 'سندات صرف الموردين', icon: Coins },
      { href: '/approvals/inbox', label: 'صندوق الاعتمادات', icon: Inbox },
      { href: '/notifications', label: 'التنبيهات', icon: Bell, badge: 'notifications' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: BarChart3,
    items: [
      { href: '/reports/operations', label: 'تقارير العمليات', icon: FileText },
      { href: '/reports/quantity-cost', label: 'تقارير مقارنة الكميات والتكاليف', icon: Scale },
      { href: '/reports/supplier-balances', label: 'تقارير مديونية الموردين', icon: Coins },
      { href: '/reports/supplier-statement', label: 'كشف حساب مورد', icon: Truck },
      { href: '/reports/approvals', label: 'تقارير الاعتمادات', icon: FileCheck },
      { href: '/reports/used-documents', label: 'تقارير الوثائق المستخدمة/المقفلة', icon: Lock },
      { href: '/reports/reorder-alerts', label: 'تنبيهات حد الطلب', icon: AlertTriangle },
    ],
  },
  {
    id: 'master-data',
    label: 'مدخلات',
    icon: Database,
    items: [
      { href: '/settings/currencies', label: 'العملات', icon: Coins },
      { href: '/settings/suppliers', label: 'الموردين', icon: Truck },
      { href: '/settings/units', label: 'الوحدات', icon: Ruler },
      { href: '/settings/items', label: 'الأصناف', icon: Boxes },
    ],
  },
  {
    id: 'administration',
    label: 'إدارة',
    icon: Cog,
    items: [
      { href: '/settings/roles', label: 'الأدوار والصلاحيات', icon: Shield },
      { href: '/settings/users', label: 'إدارة المستخدمين', icon: Users },
      { href: '/settings/user-permissions', label: 'صلاحيات المستخدمين', icon: Users },
      { href: '/settings/supplier-permissions', label: 'صلاحيات الموردين', icon: FileKey },
      { href: '/settings/approval-rules', label: 'قواعد الاعتماد', icon: ClipboardList },
      { href: '/settings/approval-requests', label: 'طلبات الاعتماد', icon: ClipboardList },
      { href: '/settings/approval-matrix', label: 'مصفوفة الاعتماد', icon: Settings },
    ],
  },
];

function groupHasActiveItem(group: NavGroup, pathname: string) {
  return group.items.some((item) => pathname.startsWith(item.href));
}

interface SidebarProps {
  unreadCount?: number;
  allowedHrefs: string[];
}

export function Sidebar({ unreadCount = 0, allowedHrefs }: SidebarProps) {
  const pathname = usePathname();
  const allowedSet = new Set(allowedHrefs);
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedSet.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of visibleGroups) {
      initial[group.id] = groupHasActiveItem(group, pathname);
    }
    return initial;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of visibleGroups) {
        if (groupHasActiveItem(group, pathname)) {
          next[group.id] = true;
        }
      }
      return next;
    });
  }, [pathname, allowedHrefs]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-sm z-40 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="font-bold text-sm text-gray-900 leading-tight">نظام إدارة ومتابعة</h1>
            <p className="text-xs text-gray-500">عمليات الشراء</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups[group.id];
          const isGroupActive = groupHasActiveItem(group, pathname);

          return (
            <div key={group.id} className="rounded-lg border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium transition-colors',
                  isGroupActive
                    ? 'bg-primary-50 text-primary-800'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                )}
                aria-expanded={isOpen}
              >
                <GroupIcon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-right">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {isOpen && (
                <div className="py-1 bg-white">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    const showBadge = item.badge === 'notifications' && unreadCount > 0;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 mr-2 ml-1 rounded-lg text-sm transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {showBadge && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 space-y-2">
        <CurrentUserDisplay />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
