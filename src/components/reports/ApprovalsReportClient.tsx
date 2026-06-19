'use client';

import { useCallback, useState, useTransition } from 'react';
import { fetchApprovalsReport } from '@/actions/reports';
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
import { formatDate, formatReportSummaryAmount, type CurrencyLike } from '@/lib/utils';
import type { ApprovalsReportRow, ReportResult } from '@/services/reports/types';
import type { ReportViewMode } from '@/components/reports/ReportViewToggle';

interface ApprovalsReportClientProps {
  initialData: ReportResult<ApprovalsReportRow>;
  baseCurrency?: CurrencyLike;
  permissions: { export: boolean; print: boolean; charts: boolean };
  printedBy?: string;
}

export function ApprovalsReportClient({ initialData, baseCurrency, permissions, printedBy }: ApprovalsReportClientProps) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ReportViewMode>('grid');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchApprovalsReport({
        status: status ? [status] : undefined,
        documentType: documentType || undefined,
        search: search || undefined,
      });
      setData(result);
    });
  }, [status, documentType, search]);

  const columns: ReportGridColumn<ApprovalsReportRow>[] = [
    { key: 'documentTypeLabel', label: 'نوع الوثيقة' },
    { key: 'documentNo', label: 'رقم الوثيقة' },
    {
      key: 'status',
      label: 'حالة الاعتماد',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: 'requestedBy', label: 'مقدم الطلب' },
    {
      key: 'requestedAt',
      label: 'تاريخ الطلب',
      render: (row) => formatDate(row.requestedAt),
    },
    {
      key: 'totalAmount',
      label: 'المبلغ',
      render: (row) => formatReportSummaryAmount(row.totalAmount, baseCurrency),
    },
  ];

  return (
    <ReportLayout
      title="تقرير الاعتمادات"
      subtitle="سجل طلبات الاعتماد وحالاتها"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onRefresh={load}
      loading={pending}
      canExport={permissions.export}
      canPrint={permissions.print}
      printedBy={printedBy}
      canChart={permissions.charts}
      exportFilename="approvals-report"
      exportColumns={columns.map((c) => ({ key: c.key, label: c.label }))}
      exportRows={data.rows.map((r) => ({
        ...r,
        requestedAt: formatDate(r.requestedAt),
      }))}
      summary={[
        { label: 'إجمالي', value: data.summary.approvalCount ?? 0 },
        { label: 'معلق', value: data.summary.pending ?? 0 },
        { label: 'معتمد', value: data.summary.approved ?? 0 },
        { label: 'مرفوض', value: data.summary.rejected ?? 0 },
      ]}
      filters={
        <ReportFiltersBar onApply={load} onReset={() => { setStatus(''); setDocumentType(''); setSearch(''); }}>
          <ReportFilterField label="الحالة">
            <select className={reportSelectClass()} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">الكل</option>
              <option value="Pending">معلق</option>
              <option value="Approved">معتمد</option>
              <option value="Rejected">مرفوض</option>
            </select>
          </ReportFilterField>
          <ReportFilterField label="نوع الوثيقة">
            <input className={reportInputClass()} value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder="PURCHASE_ORDER..." />
          </ReportFilterField>
          <ReportFilterField label="بحث">
            <input className={reportInputClass()} value={search} onChange={(e) => setSearch(e.target.value)} />
          </ReportFilterField>
        </ReportFiltersBar>
      }
    >
      {viewMode === 'grid' ? (
        <ReportGrid columns={columns} rows={data.rows} drillDownRoute={(row) => row.route} />
      ) : (
        <ReportCharts data={data.chartData} title="توزيع الاعتمادات حسب الحالة" />
      )}
    </ReportLayout>
  );
}
