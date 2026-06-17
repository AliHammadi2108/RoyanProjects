'use client';

import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { fetchUsedDocumentsReport } from '@/actions/reports';
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
import type { ReportResult, UsedDocumentRow } from '@/services/reports/types';
import type { ReportViewMode } from '@/components/reports/ReportViewToggle';

interface UsedDocumentsReportClientProps {
  initialData: ReportResult<UsedDocumentRow>;
  permissions: { export: boolean; print: boolean; charts: boolean };
  printedBy?: string;
}

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'PURCHASE_REQUEST', label: 'طلب شراء' },
  { value: 'QUOTATION', label: 'عرض سعر' },
  { value: 'TECHNICAL_COMPARISON', label: 'مقارنة فنية' },
  { value: 'SUPPLIER_NOMINATION', label: 'ترشيح مورد' },
  { value: 'PURCHASE_ORDER', label: 'أمر شراء' },
  { value: 'INSPECTION', label: 'فحص' },
  { value: 'RECEIVING', label: 'إذن توريد' },
];

const EXPORT_COLUMNS = [
  { key: 'documentTypeLabel', label: 'النوع' },
  { key: 'documentNo', label: 'رقم الوثيقة' },
  { key: 'documentDate', label: 'التاريخ' },
  { key: 'status', label: 'الحالة' },
  { key: 'usageType', label: 'نوع الاستخدام' },
  { key: 'childNo', label: 'الوثيقة التالية' },
];

export function UsedDocumentsReportClient({
  initialData,
  permissions,
  printedBy,
}: UsedDocumentsReportClientProps) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ReportViewMode>('grid');
  const [pending, startTransition] = useTransition();
  const [documentType, setDocumentType] = useState('');
  const [usageType, setUsageType] = useState<'used' | 'locked' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(
    (overrides?: { page?: number }) => {
      startTransition(async () => {
        const result = await fetchUsedDocumentsReport({
          documentType: documentType || undefined,
          usageType,
          search: search || undefined,
          page: overrides?.page ?? page,
          sortBy: 'documentDate',
          sortDir: 'desc',
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
      });
    },
    [documentType, usageType, search, page]
  );

  const columns: ReportGridColumn<UsedDocumentRow>[] = [
    { key: 'documentTypeLabel', label: 'النوع' },
    { key: 'documentNo', label: 'رقم الوثيقة' },
    {
      key: 'documentDate',
      label: 'التاريخ',
      render: (row) => formatDate(row.documentDate),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'usageType',
      label: 'الحالة التشغيلية',
      render: (row) => (
        <span
          className={
            row.usageType === 'used'
              ? 'text-blue-700 text-xs font-medium'
              : 'text-amber-700 text-xs font-medium'
          }
        >
          {row.usageType === 'used' ? 'مستخدمة' : 'مقفلة'}
        </span>
      ),
    },
    {
      key: 'childNo',
      label: 'مرتبطة بـ',
      render: (row) =>
        row.childRoute && row.childNo ? (
          <Link href={row.childRoute} className="text-primary-600 hover:underline text-xs" onClick={(e) => e.stopPropagation()}>
            {row.childNo}
          </Link>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <ReportLayout
      title="تقرير الوثائق المستخدمة والمقفلة"
      subtitle="وثائق محوّلة لمرحلة لاحقة أو مقفلة للتعديل"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onRefresh={() => load()}
      loading={pending}
      canExport={permissions.export}
      canPrint={permissions.print}
      printedBy={printedBy}
      canChart={permissions.charts}
      exportFilename="used-documents"
      exportColumns={EXPORT_COLUMNS}
      exportRows={data.rows.map((r) => ({
        ...r,
        documentDate: formatDate(r.documentDate),
        usageType: r.usageType === 'used' ? 'مستخدمة' : 'مقفلة',
        childNo: r.childNo || '-',
      }))}
      summary={[
        { label: 'مستخدمة', value: data.summary.usedCount ?? 0 },
        { label: 'مقفلة', value: data.summary.lockedCount ?? 0 },
        { label: 'الإجمالي', value: data.summary.total ?? 0 },
      ]}
      filters={
        <ReportFiltersBar onApply={() => load({ page: 1 })} onReset={() => { setDocumentType(''); setUsageType('all'); setSearch(''); setPage(1); }}>
          <ReportFilterField label="نوع الوثيقة">
            <select className={reportSelectClass()} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="نوع التقرير">
            <select className={reportSelectClass()} value={usageType} onChange={(e) => setUsageType(e.target.value as 'used' | 'locked' | 'all')}>
              <option value="all">الكل</option>
              <option value="used">مستخدمة فقط</option>
              <option value="locked">مقفلة فقط</option>
            </select>
          </ReportFilterField>
          <ReportFilterField label="بحث">
            <input className={reportInputClass()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="رقم وثيقة..." />
          </ReportFilterField>
        </ReportFiltersBar>
      }
    >
      {viewMode === 'grid' ? (
        <>
          <ReportGrid columns={columns} rows={data.rows} drillDownRoute={(row) => row.route} />
          {data.total > data.pageSize ? (
            <div className="flex justify-center gap-2 print:hidden">
              <button type="button" disabled={page <= 1} className="btn-secondary text-sm" onClick={() => load({ page: page - 1 })}>السابق</button>
              <span className="text-sm text-gray-600 py-2">صفحة {page}</span>
              <button type="button" disabled={page >= Math.ceil(data.total / data.pageSize)} className="btn-secondary text-sm" onClick={() => load({ page: page + 1 })}>التالي</button>
            </div>
          ) : null}
        </>
      ) : (
        <ReportCharts data={data.chartData} title="توزيع الوثائق" />
      )}
    </ReportLayout>
  );
}
