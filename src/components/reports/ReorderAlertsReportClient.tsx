'use client';

import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchReorderAlertsReport,
  fetchBulkPrRoutesFromAlerts,
} from '@/actions/reorder-alerts';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportGrid, type ReportGridColumn } from '@/components/reports/ReportGrid';
import { ReportCharts } from '@/components/reports/ReportCharts';
import {
  ReportFiltersBar,
  ReportFilterField,
  reportInputClass,
  reportSelectClass,
} from '@/components/reports/ReportFilters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import type { ReorderAlertRow } from '@/services/reorder-alert.service';
import type { ReportResult } from '@/services/reports/types';
import type { ReportViewMode } from '@/components/reports/ReportViewToggle';

interface ReorderAlertsReportClientProps {
  initialData: ReportResult<ReorderAlertRow>;
  permissions: { export: boolean; print: boolean; createPr: boolean };
  filterOptions: {
    warehouses: Array<{ id: string; nameAr: string }>;
    suppliers: Array<{ id: string; code: string; nameAr: string }>;
  };
  printedBy?: string;
}

const EXPORT_COLUMNS = [
  { key: 'itemCode', label: 'كود الصنف' },
  { key: 'itemName', label: 'اسم الصنف' },
  { key: 'warehouseName', label: 'المخزن' },
  { key: 'currentStockBaseQty', label: 'الرصيد (أساسي)' },
  { key: 'reorderLevelBaseQty', label: 'حد الطلب' },
  { key: 'reorderQtyBase', label: 'كمية إعادة الطلب' },
  { key: 'preferredSupplierName', label: 'المورد المفضل' },
  { key: 'status', label: 'الحالة' },
  { key: 'notifiedAt', label: 'تاريخ التنبيه' },
];

export function ReorderAlertsReportClient({
  initialData,
  permissions,
  filterOptions,
  printedBy,
}: ReorderAlertsReportClientProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ReportViewMode>('grid');
  const [pending, startTransition] = useTransition();
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouseId') || '');
  const [supplierId, setSupplierId] = useState('');
  const [alertStatus, setAlertStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bulkRoutes, setBulkRoutes] = useState<
    Array<{ supplierId: string; supplierName: string; route: string; itemCount: number }>
  >([]);

  const load = useCallback(
    (overrides?: { page?: number }) => {
      startTransition(async () => {
        const result = await fetchReorderAlertsReport({
          warehouseId: warehouseId || undefined,
          supplierId: supplierId || undefined,
          alertStatus,
          search: search || undefined,
          itemId: searchParams.get('itemId') || undefined,
          page: overrides?.page ?? page,
          sortBy: 'notifiedAt',
          sortDir: 'desc',
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
      });
    },
    [warehouseId, supplierId, alertStatus, search, page, searchParams]
  );

  const loadBulkPr = () => {
    startTransition(async () => {
      const routes = await fetchBulkPrRoutesFromAlerts({
        warehouseId: warehouseId || undefined,
        supplierId: supplierId || undefined,
        search: search || undefined,
      });
      setBulkRoutes(routes);
    });
  };

  const columns: ReportGridColumn<ReorderAlertRow>[] = [
    { key: 'itemCode', label: 'كود الصنف' },
    { key: 'itemName', label: 'اسم الصنف' },
    { key: 'warehouseName', label: 'المخزن', render: (r) => r.warehouseName || '—' },
    {
      key: 'currentStockBaseQty',
      label: 'الرصيد',
      render: (r) => (
        <span>
          {r.currentStockBaseQty}
          {r.baseUnitName ? ` ${r.baseUnitName}` : ''}
        </span>
      ),
    },
    { key: 'reorderLevelBaseQty', label: 'حد الطلب' },
    { key: 'reorderQtyBase', label: 'كمية الطلب' },
    {
      key: 'preferredSupplierName',
      label: 'المورد المفضل',
      render: (r) => r.preferredSupplierName || '—',
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (r) => (
        <StatusBadge status={r.status === 'open' ? 'Pending Approval' : 'Closed'} />
      ),
    },
    {
      key: 'notifiedAt',
      label: 'تاريخ التنبيه',
      render: (r) => formatDate(r.notifiedAt),
    },
    ...(permissions.createPr
      ? [
          {
            key: 'actions',
            label: 'إجراء',
            render: (r: ReorderAlertRow) => (
              <Link href={r.prRoute} className="text-primary-600 text-xs font-medium">
                طلب شراء
              </Link>
            ),
          } as ReportGridColumn<ReorderAlertRow>,
        ]
      : []),
  ];

  return (
    <ReportLayout
      title="الأصناف التي وصلت حد الطلب"
      subtitle="تنبيهات إعادة الطلب وإنشاء طلبات شراء"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onRefresh={() => load()}
      loading={pending}
      canExport={permissions.export}
      canPrint={permissions.print}
      printedBy={printedBy}
      canChart={false}
      exportFilename="reorder_alerts"
      exportColumns={EXPORT_COLUMNS}
      exportRows={data.rows as unknown as Record<string, unknown>[]}
      summary={[
        { label: 'عدد التنبيهات', value: data.summary.alertCount ?? 0 },
        { label: 'مفتوحة', value: data.summary.openCount ?? 0 },
        { label: 'أصناف', value: data.summary.itemCount ?? 0 },
      ]}
      filters={
        <ReportFiltersBar onApply={() => load({ page: 1 })} onReset={() => {
          setWarehouseId('');
          setSupplierId('');
          setAlertStatus('open');
          setSearch('');
          setPage(1);
        }}>
          <ReportFilterField label="بحث">
            <input
              className={reportInputClass()}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="كود أو اسم الصنف"
            />
          </ReportFilterField>
          <ReportFilterField label="المخزن">
            <select
              className={reportSelectClass()}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">الكل</option>
              {filterOptions.warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.nameAr}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="المورد المفضل">
            <select
              className={reportSelectClass()}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">الكل</option>
              {filterOptions.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="الحالة">
            <select
              className={reportSelectClass()}
              value={alertStatus}
              onChange={(e) => setAlertStatus(e.target.value as 'open' | 'closed' | 'all')}
            >
              <option value="open">مفتوحة</option>
              <option value="closed">مغلقة</option>
              <option value="all">الكل</option>
            </select>
          </ReportFilterField>
        </ReportFiltersBar>
      }
    >
      {permissions.createPr && (
        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" className="btn-primary text-sm" onClick={loadBulkPr} disabled={pending}>
            تجميع طلبات شراء حسب المورد
          </button>
          {bulkRoutes.map((b) => (
            <Link key={b.supplierId} href={b.route} className="btn-secondary text-sm">
              {b.supplierName} ({b.itemCount})
            </Link>
          ))}
        </div>
      )}

      {viewMode === 'grid' ? (
        <>
          <ReportGrid columns={columns} rows={data.rows} />
          {data.total > data.pageSize ? (
            <div className="flex justify-center gap-2 print:hidden">
              <button
                type="button"
                disabled={page <= 1}
                className="btn-secondary text-sm"
                onClick={() => load({ page: page - 1 })}
              >
                السابق
              </button>
              <span className="text-sm text-gray-600 py-2">صفحة {page}</span>
              <button
                type="button"
                disabled={page >= Math.ceil(data.total / data.pageSize)}
                className="btn-secondary text-sm"
                onClick={() => load({ page: page + 1 })}
              >
                التالي
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <ReportCharts data={data.chartData} title="توزيع التنبيهات" />
      )}
    </ReportLayout>
  );
}
