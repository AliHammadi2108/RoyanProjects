'use client';

import { useCallback, useState, useTransition } from 'react';
import { fetchOperationsReport } from '@/actions/reports';
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
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type { OperationsReportRow, ReportResult } from '@/services/reports/types';
import type { ReportViewMode } from '@/components/reports/ReportViewToggle';

interface FilterOptions {
  suppliers: { id: string; code: string; nameAr: string }[];
  warehouses: { id: string; nameAr: string }[];
  items: { id: string; code: string; nameAr: string }[];
}

interface OperationsReportClientProps {
  initialData: ReportResult<OperationsReportRow>;
  filterOptions: FilterOptions;
  permissions: { export: boolean; print: boolean; charts: boolean; viewCost: boolean };
  printedBy?: string;
}

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'PURCHASE_REQUEST', label: 'طلب شراء' },
  { value: 'QUOTATION', label: 'عرض سعر' },
  { value: 'PURCHASE_ORDER', label: 'أمر شراء' },
  { value: 'RECEIVING', label: 'إذن توريد' },
  { value: 'INVOICE', label: 'فاتورة' },
];

const EXPORT_COLUMNS = [
  { key: 'documentTypeLabel', label: 'نوع الوثيقة' },
  { key: 'documentNo', label: 'رقم الوثيقة' },
  { key: 'documentDate', label: 'التاريخ' },
  { key: 'status', label: 'الحالة' },
  { key: 'supplierName', label: 'المورد' },
  { key: 'warehouseName', label: 'المخزن' },
  { key: 'totalAmount', label: 'الإجمالي' },
  { key: 'baseQtyTotal', label: 'الكمية الأساسية' },
];

export function OperationsReportClient({
  initialData,
  filterOptions,
  permissions,
  printedBy,
}: OperationsReportClientProps) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ReportViewMode>('grid');
  const [pending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [search, setSearch] = useState('');
  const [includeDraft, setIncludeDraft] = useState(false);
  const [sortBy, setSortBy] = useState('documentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(
    (overrides?: { page?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) => {
      startTransition(async () => {
        const result = await fetchOperationsReport({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          supplierId: supplierId || undefined,
          warehouseId: warehouseId || undefined,
          itemId: itemId || undefined,
          documentType: documentType || undefined,
          search: search || undefined,
          includeDraft,
          page: overrides?.page ?? page,
          sortBy: overrides?.sortBy ?? sortBy,
          sortDir: overrides?.sortDir ?? sortDir,
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
        if (overrides?.sortBy) setSortBy(overrides.sortBy);
        if (overrides?.sortDir) setSortDir(overrides.sortDir);
      });
    },
    [dateFrom, dateTo, supplierId, warehouseId, itemId, documentType, search, includeDraft, page, sortBy, sortDir]
  );

  const columns: ReportGridColumn<OperationsReportRow>[] = [
    { key: 'documentTypeLabel', label: 'النوع', sortable: true },
    { key: 'documentNo', label: 'رقم الوثيقة', sortable: true },
    {
      key: 'documentDate',
      label: 'التاريخ',
      sortable: true,
      render: (row) => formatDate(row.documentDate),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'supplierName', label: 'المورد' },
    { key: 'warehouseName', label: 'المخزن' },
    ...(permissions.viewCost
      ? [
          {
            key: 'totalAmount',
            label: 'الإجمالي',
            sortable: true,
            render: (row: OperationsReportRow) => formatCurrency(row.totalAmount),
          } as ReportGridColumn<OperationsReportRow>,
        ]
      : []),
    {
      key: 'baseQtyTotal',
      label: 'كمية أساسية',
      sortable: true,
      render: (row) => formatNumber(row.baseQtyTotal ?? 0),
    },
  ];

  const exportRows = data.rows.map((r) => ({
    ...r,
    documentDate: formatDate(r.documentDate),
    supplierName: r.supplierName || '-',
    warehouseName: r.warehouseName || '-',
  }));

  const handleSort = (key: string) => {
    const nextDir = sortBy === key && sortDir === 'desc' ? 'asc' : 'desc';
    load({ sortBy: key, sortDir: nextDir, page: 1 });
  };

  return (
    <ReportLayout
      title="تقرير عمليات الشراء"
      subtitle="طلبات، عروض، أوامر، توريد، وفواتير — المعتمدة افتراضياً"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onRefresh={() => load()}
      loading={pending}
      canExport={permissions.export}
      canPrint={permissions.print}
      printedBy={printedBy}
      canChart={permissions.charts}
      exportFilename="operations-report"
      exportColumns={EXPORT_COLUMNS}
      exportRows={exportRows}
      summary={[
        { label: 'عدد الوثائق', value: data.summary.documentCount ?? 0 },
        ...(permissions.viewCost
          ? [{ label: 'إجمالي المبالغ', value: formatCurrency(Number(data.summary.totalAmount ?? 0)) }]
          : []),
        { label: 'إجمالي الكميات الأساسية', value: formatNumber(Number(data.summary.totalBaseQty ?? 0)) },
      ]}
      filters={
        <ReportFiltersBar
          onApply={() => load({ page: 1 })}
          onReset={() => {
            setDateFrom('');
            setDateTo('');
            setSupplierId('');
            setWarehouseId('');
            setItemId('');
            setDocumentType('');
            setSearch('');
            setIncludeDraft(false);
            setPage(1);
          }}
        >
          <ReportFilterField label="من تاريخ">
            <input type="date" className={reportInputClass()} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </ReportFilterField>
          <ReportFilterField label="إلى تاريخ">
            <input type="date" className={reportInputClass()} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </ReportFilterField>
          <ReportFilterField label="نوع الوثيقة">
            <select className={reportSelectClass()} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="المورد">
            <select className={reportSelectClass()} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="المخزن">
            <select className={reportSelectClass()} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.nameAr}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="الصنف">
            <select className={reportSelectClass()} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">الكل</option>
              {filterOptions.items.map((i) => (
                <option key={i.id} value={i.id}>{i.code} — {i.nameAr}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="بحث">
            <input className={reportInputClass()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="رقم أو مورد..." />
          </ReportFilterField>
          <ReportFilterField label="تضمين المسودات">
            <label className="flex items-center gap-2 text-sm pt-2">
              <input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} />
              عرض كل الحالات
            </label>
          </ReportFilterField>
        </ReportFiltersBar>
      }
    >
      {viewMode === 'grid' ? (
        <>
          <ReportGrid
            columns={columns}
            rows={data.rows}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            drillDownRoute={(row) => row.route}
          />
          {data.total > data.pageSize ? (
            <div className="flex justify-center gap-2 print:hidden">
              <button
                type="button"
                disabled={page <= 1 || pending}
                className="btn-secondary text-sm"
                onClick={() => load({ page: page - 1 })}
              >
                السابق
              </button>
              <span className="text-sm text-gray-600 py-2">
                صفحة {page} من {Math.ceil(data.total / data.pageSize)}
              </span>
              <button
                type="button"
                disabled={page >= Math.ceil(data.total / data.pageSize) || pending}
                className="btn-secondary text-sm"
                onClick={() => load({ page: page + 1 })}
              >
                التالي
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <ReportCharts data={data.chartData} title="توزيع الوثائق حسب النوع" />
      )}
    </ReportLayout>
  );
}
