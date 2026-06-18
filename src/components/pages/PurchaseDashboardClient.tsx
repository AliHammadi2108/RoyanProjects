'use client';

import Link from 'next/link';
import {
  FileText,
  Receipt,
  GitCompare,
  UserCheck,
  ShoppingCart,
  ClipboardCheck,
  Package,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { getStatusLabel } from '@/lib/status-labels';
import { openFilterHref } from '@/lib/purchase-open-filter';
import type { PurchaseDashboardData } from '@/services/purchase-dashboard.service';
import type { ReportChartPoint } from '@/services/reports/types';

const STAGE_ICONS: Record<string, LucideIcon> = {
  PURCHASE_REQUEST: FileText,
  QUOTATION: Receipt,
  TECHNICAL_COMPARISON: GitCompare,
  SUPPLIER_NOMINATION: UserCheck,
  PURCHASE_ORDER: ShoppingCart,
  INSPECTION: ClipboardCheck,
  RECEIVING: Package,
  INVOICE: FileSpreadsheet,
};

const STAGE_COLORS: Record<string, string> = {
  PURCHASE_REQUEST: 'border-r-primary-500 bg-primary-50/40',
  QUOTATION: 'border-r-blue-500 bg-blue-50/40',
  TECHNICAL_COMPARISON: 'border-r-amber-500 bg-amber-50/40',
  SUPPLIER_NOMINATION: 'border-r-green-500 bg-green-50/40',
  PURCHASE_ORDER: 'border-r-primary-500 bg-primary-50/40',
  INSPECTION: 'border-r-amber-500 bg-amber-50/40',
  RECEIVING: 'border-r-green-500 bg-green-50/40',
  INVOICE: 'border-r-blue-500 bg-blue-50/40',
};

const CHART_COLORS = [
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

interface PurchaseDashboardClientProps {
  data: PurchaseDashboardData;
  allowedRoutes: string[];
}

function ClickableBarChart({
  data,
  title,
  getHref,
}: {
  data: ReportChartPoint[];
  title: string;
  getHref: (label: string) => string | null;
}) {
  if (!data.length) {
    return (
      <div className="card text-center py-12 text-gray-500 text-sm">لا توجد عمليات مفتوحة للعرض</div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <div className="space-y-3" role="img" aria-label={title}>
        {data.map((point) => {
          const pct = Math.round((point.value / max) * 100);
          const href = getHref(point.label);
          const inner = (
            <>
              <div className="flex items-center justify-between text-xs text-gray-600 gap-2">
                <span className="truncate flex-1 text-right" title={point.label}>
                  {point.label}
                </span>
                <span className="shrink-0 font-medium text-gray-800">{formatNumber(point.value)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          );

          if (href) {
            return (
              <Link
                key={point.label}
                href={href}
                className="block space-y-1 rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors"
              >
                {inner}
              </Link>
            );
          }

          return (
            <div key={point.label} className="space-y-1">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({
  data,
  stages,
  allowedRoutes,
}: {
  data: ReportChartPoint[];
  stages: PurchaseDashboardData['stages'];
  allowedRoutes: string[];
}) {
  const allowed = new Set(allowedRoutes);
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) {
    return (
      <div className="card text-center py-12 text-gray-500 text-sm">لا توجد بيانات للرسم الدائري</div>
    );
  }

  const total = filtered.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const segments = filtered.map((point, i) => {
    const start = cumulative;
    cumulative += (point.value / total) * 100;
    const stage = stages.find((s) => s.label === point.label);
    return {
      ...point,
      start,
      end: cumulative,
      color: CHART_COLORS[i % CHART_COLORS.length],
      route: stage?.route,
    };
  });

  const gradient = segments
    .map((s) => `${s.color} ${s.start}% ${s.end}%`)
    .join(', ');

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-medium text-gray-700">توزيع العمليات المفتوحة</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div
          className="relative w-40 h-40 rounded-full shrink-0"
          style={{ background: `conic-gradient(${gradient})` }}
          role="img"
          aria-label="رسم دائري للعمليات المفتوحة"
        >
          <div className="absolute inset-6 bg-white rounded-full flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{formatNumber(total)}</span>
            <span className="text-xs text-gray-500">مفتوحة</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2 w-full">
          {segments.map((seg) => {
            const pct = Math.round((seg.value / total) * 100);
            const canLink = seg.route && allowed.has(seg.route);
            const content = (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="flex-1 text-right text-gray-700">{seg.label}</span>
                <span className="text-gray-500 text-xs">{pct}%</span>
                <span className="font-medium text-gray-900 w-8 text-left">{formatNumber(seg.value)}</span>
              </div>
            );

            if (canLink) {
              return (
                <li key={seg.label}>
                  <Link
                    href={openFilterHref(seg.route!)}
                    className="block rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return <li key={seg.label} className="px-2 py-1.5">{content}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}

export function PurchaseDashboardClient({ data, allowedRoutes }: PurchaseDashboardClientProps) {
  const allowed = new Set(allowedRoutes);
  const visibleStages = data.stages.filter((s) => allowed.has(s.route));

  const labelToRoute = new Map(visibleStages.map((s) => [s.label, s.route]));

  return (
    <div className="space-y-6">
      <div className="card border-r-4 border-r-primary-500">
        <p className="text-sm text-gray-600 mb-1">إجمالي العمليات المفتوحة</p>
        <p className="text-3xl font-bold text-gray-900">{formatNumber(data.totalOpen)}</p>
        <p className="text-xs text-gray-500 mt-2">
          تُحسب فقط الوثائق قيد التنفيذ غير المكتملة أو الملغاة أو المحوّلة لمرحلة لاحقة
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleStages.map((stage) => {
          const Icon = STAGE_ICONS[stage.stage] || FileText;
          const colorClass = STAGE_COLORS[stage.stage] || 'border-r-primary-500';
          return (
            <Link
              key={stage.stage}
              href={openFilterHref(stage.route)}
              className={`card border-r-4 ${colorClass} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700">{stage.label}</h3>
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stage.openCount)}</p>
              <p className="text-xs text-primary-600 mt-2">عرض المفتوحة ←</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClickableBarChart
          data={data.chartByStage.filter((p) => labelToRoute.has(p.label))}
          title="العمليات المفتوحة حسب المرحلة"
          getHref={(label) => {
            const route = labelToRoute.get(label);
            return route ? openFilterHref(route) : null;
          }}
        />
        <DonutChart
          data={data.chartByStage}
          stages={data.stages}
          allowedRoutes={allowedRoutes}
        />
      </div>

      {visibleStages.some((s) => s.byStatus.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleStages
            .filter((s) => s.byStatus.length > 0)
            .map((stage) => (
              <div key={stage.stage} className="card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-700">{stage.label} — حسب الحالة</h3>
                  <Link
                    href={openFilterHref(stage.route)}
                    className="text-xs text-primary-600 hover:underline shrink-0"
                  >
                    عرض الكل
                  </Link>
                </div>
                <div className="space-y-2">
                  {stage.byStatus.map((row) => (
                    <Link
                      key={row.label}
                      href={openFilterHref(stage.route)}
                      className="flex items-center justify-between text-xs rounded px-2 py-1 hover:bg-gray-50"
                    >
                      <span className="text-gray-600">{getStatusLabel(row.label) || row.label}</span>
                      <span className="font-medium text-gray-800">{formatNumber(row.value)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
