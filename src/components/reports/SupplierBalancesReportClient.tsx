'use client';

import { useCallback, useState, useTransition } from 'react';
import { fetchSupplierBalancesReport } from '@/actions/reports';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportGrid, type ReportGridColumn } from '@/components/reports/ReportGrid';
import { ReportCharts } from '@/components/reports/ReportCharts';
import {
  ReportFiltersBar,
  ReportFilterField,
  reportInputClass,
  reportSelectClass,
} from '@/components/reports/ReportFilters';
import { formatCurrency } from '@/lib/utils';
import type { ReportResult, SupplierBalanceRow } from '@/services/reports/types';
import type { ReportViewMode } from '@/components/reports/ReportViewToggle';

interface SupplierBalancesReportClientProps {
  initialData: ReportResult<SupplierBalanceRow>;
  suppliers: { id: string; code: string; nameAr: string }[];
  permissions: { export: boolean; print: boolean; charts: boolean; viewBalance: boolean };
}

const EXPORT_COLUMNS = [
  { key: 'supplierCode', label: 'كود المورد' },
  { key: 'supplierName', label: 'المورد' },
  { key: 'invoiceCount', label: 'عدد الفواتير' },
  { key: 'totalInvoiced', label: 'إجمالي الفواتير' },
  { key: 'totalPaid', label: 'المدفوع' },
  { key: 'balance', label: 'الرصيد' },
];

export function SupplierBalancesReportClient({
  initialData,
  suppliers,
  permissions,
}: SupplierBalancesReportClientProps) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ReportViewMode>('grid');
  const [pending, startTransition] = useTransition();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('balance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(
    (overrides?: { page?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) => {
      startTransition(async () => {
        const result = await fetchSupplierBalancesReport({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          supplierId: supplierId || undefined,
          search: search || undefined,
          page: overrides?.page ?? page,
          sortBy: overrides?.sortBy ?? sortBy,
          sortDir: overrides?.sortDir ?? sortDir,
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
      });
    },
    [dateFrom, dateTo, supplierId, search, page, sortBy, sortDir]
  );

  const columns: ReportGridColumn<SupplierBalanceRow>[] = [
    { key: 'supplierCode', label: 'الكود', sortable: true },
    { key: 'supplierName', label: 'المورد', sortable: true },
    { key: 'invoiceCount', label: 'فواتير', sortable: true },
    ...(permissions.viewBalance
      ? [
          {
            key: 'totalInvoiced',
            label: 'إجمالي الفواتير',
            sortable: true,
            render: (row: SupplierBalanceRow) => formatCurrency(row.totalInvoiced),
          },
          {
            key: 'totalPaid',
            label: 'المدفوع',
            sortable: true,
            render: (row: SupplierBalanceRow) => formatCurrency(row.totalPaid),
          },
          {
            key: 'balance',
            label: 'الرصيد',
            sortable: true,
            render: (row: SupplierBalanceRow) => (
              <span className={row.balance > 0 ? 'text-red-700 font-medium' : 'text-green-700'}>
                {formatCurrency(row.balance)}
              </span>
            ),
          },
        ]
      : []),
  ];

  const handleSort = (key: string) => {
    const nextDir = sortBy === key && sortDir === 'desc' ? 'asc' : 'desc';
    setSortBy(key);
    setSortDir(nextDir);
    load({ sortBy: key, sortDir: nextDir, page: 1 });
  };

  return (
    <ReportLayout
      title="تقرير مديونية الموردين"
      subtitle="ملخص أرصدة الموردين من فواتير الشراء المعتمدة"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onRefresh={() => load()}
      loading={pending}
      canExport={permissions.export}
      canPrint={permissions.print}
      canChart={permissions.charts && permissions.viewBalance}
      exportFilename="supplier-balances"
      exportColumns={EXPORT_COLUMNS}
      exportRows={data.rows as unknown as Record<string, unknown>[]}
      summary={
        permissions.viewBalance
          ? [
              { label: 'عدد الموردين', value: data.summary.supplierCount ?? 0 },
              { label: 'إجمالي الفواتير', value: formatCurrency(Number(data.summary.totalInvoiced ?? 0)) },
              { label: 'إجمالي المديونية', value: formatCurrency(Number(data.summary.totalBalance ?? 0)) },
            ]
          : [{ label: 'عدد الموردين', value: data.summary.supplierCount ?? 0 }]
      }
      filters={
        <ReportFiltersBar onApply={() => load({ page: 1 })} onReset={() => { setDateFrom(''); setDateTo(''); setSupplierId(''); setSearch(''); setPage(1); }}>
          <ReportFilterField label="من تاريخ">
            <input type="date" className={reportInputClass()} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </ReportFilterField>
          <ReportFilterField label="إلى تاريخ">
            <input type="date" className={reportInputClass()} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </ReportFilterField>
          <ReportFilterField label="المورد">
            <select className={reportSelectClass()} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">الكل</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </ReportFilterField>
          <ReportFilterField label="بحث">
            <input className={reportInputClass()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم أو كود مورد..." />
          </ReportFilterField>
        </ReportFiltersBar>
      }
    >
      {viewMode === 'grid' ? (
        <>
          <ReportGrid columns={columns} rows={data.rows} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
          {data.total > data.pageSize ? (
            <div className="flex justify-center gap-2 print:hidden">
              <button type="button" disabled={page <= 1} className="btn-secondary text-sm" onClick={() => load({ page: page - 1 })}>السابق</button>
              <span className="text-sm text-gray-600 py-2">صفحة {page}</span>
              <button type="button" disabled={page >= Math.ceil(data.total / data.pageSize)} className="btn-secondary text-sm" onClick={() => load({ page: page + 1 })}>التالي</button>
            </div>
          ) : null}
        </>
      ) : (
        <ReportCharts data={data.chartData} title="أعلى أرصدة الموردين" valuePrefix="ر.س " />
      )}
    </ReportLayout>
  );
}
