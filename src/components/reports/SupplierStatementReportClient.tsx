'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchSupplierStatementReport,
  fetchSuppliersForStatement,
} from '@/actions/reports';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { ReportGrid, type ReportGridColumn } from '@/components/reports/ReportGrid';
import {
  ReportFiltersBar,
  ReportFilterField,
  reportInputClass,
  reportSelectClass,
} from '@/components/reports/ReportFilters';
import { ListSearchAutocomplete } from '@/components/ui/ListSearchAutocomplete';
import { AutocompleteSelect } from '@/components/ui/AutocompleteSelect';
import type { AutocompleteOption } from '@/lib/autocomplete';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ReportResult, SupplierStatementRow } from '@/services/reports/types';

interface SupplierOption {
  id: string;
  code: string;
  nameAr: string;
  phone?: string | null;
  taxNo?: string | null;
  invoiceCount: number;
}

interface SupplierStatementReportClientProps {
  suppliers: SupplierOption[];
  currencies: { id: string; code: string; nameAr: string }[];
  permissions: { export: boolean; print: boolean; viewBalance: boolean };
}

const EXPORT_COLUMNS = [
  { key: 'movementDate', label: 'التاريخ' },
  { key: 'movementTypeLabel', label: 'النوع' },
  { key: 'documentNo', label: 'رقم الوثيقة' },
  { key: 'description', label: 'البيان' },
  { key: 'debit', label: 'مدين' },
  { key: 'credit', label: 'دائن' },
  { key: 'balance', label: 'الرصيد' },
  { key: 'currencyCode', label: 'العملة' },
  { key: 'exchangeRate', label: 'سعر الصرف' },
  { key: 'paymentStatus', label: 'حالة السداد' },
];

const EMPTY_DATA: ReportResult<SupplierStatementRow> = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 25,
  summary: {},
  chartData: [],
};

export function SupplierStatementReportClient({
  suppliers: initialSuppliers,
  currencies,
  permissions,
}: SupplierStatementReportClientProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState('');
  const [data, setData] = useState<ReportResult<SupplierStatementRow>>(EMPTY_DATA);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [movementType, setMovementType] = useState('');
  const [sortBy, setSortBy] = useState('movementDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const searchSuppliers = useCallback((q: string) => {
    startTransition(async () => {
      const result = await fetchSuppliersForStatement(q || undefined);
      setSuppliers(result);
    });
  }, []);

  const loadStatement = useCallback(
    (overrides?: { page?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) => {
      if (!supplierId) return;
      startTransition(async () => {
        const result = await fetchSupplierStatementReport(supplierId, {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          currencyId: currencyId || undefined,
          paymentStatus: paymentStatus || undefined,
          movementType: movementType || undefined,
          page: overrides?.page ?? page,
          sortBy: overrides?.sortBy ?? sortBy,
          sortDir: overrides?.sortDir ?? sortDir,
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
      });
    },
    [supplierId, dateFrom, dateTo, currencyId, paymentStatus, movementType, page, sortBy, sortDir]
  );

  const columns: ReportGridColumn<SupplierStatementRow>[] = [
    {
      key: 'movementDate',
      label: 'التاريخ',
      sortable: true,
      render: (row) => formatDate(row.movementDate),
    },
    { key: 'movementTypeLabel', label: 'النوع', sortable: true },
    { key: 'documentNo', label: 'رقم الوثيقة', sortable: true },
    { key: 'description', label: 'البيان' },
    ...(permissions.viewBalance
      ? [
          {
            key: 'debit',
            label: 'مدين',
            sortable: true,
            render: (row: SupplierStatementRow) =>
              row.debit > 0 ? formatCurrency(row.debit) : '-',
          },
          {
            key: 'credit',
            label: 'دائن',
            sortable: true,
            render: (row: SupplierStatementRow) =>
              row.credit > 0 ? formatCurrency(row.credit) : '-',
          },
          {
            key: 'balance',
            label: 'الرصيد',
            sortable: true,
            render: (row: SupplierStatementRow) => formatCurrency(row.balance),
          },
        ]
      : []),
    { key: 'currencyCode', label: 'العملة' },
    {
      key: 'exchangeRate',
      label: 'سعر الصرف',
      render: (row) => row.exchangeRate.toFixed(4),
    },
    {
      key: 'dueDate',
      label: 'تاريخ الاستحقاق',
      render: (row) => (row.dueDate ? formatDate(row.dueDate) : '-'),
    },
    { key: 'paymentStatus', label: 'حالة السداد' },
  ];

  const handleSort = (key: string) => {
    const nextDir = sortBy === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(key);
    setSortDir(nextDir);
    loadStatement({ sortBy: key, sortDir: nextDir, page: 1 });
  };

  const supplierOptions: AutocompleteOption[] = suppliers.map((s) => ({
    value: s.id,
    label: `${s.code} - ${s.nameAr}`,
    sublabel: `${s.invoiceCount} فاتورة${s.phone ? ` · ${s.phone}` : ''}`,
    keywords: [s.code, s.nameAr, s.phone, s.taxNo].filter(Boolean).join(' '),
  }));

  const listSearchOptions: AutocompleteOption[] = suppliers.map((s) => ({
    value: s.id,
    label: `${s.code} - ${s.nameAr}`,
    sublabel: s.phone ? `هاتف: ${s.phone}` : undefined,
    filterText: [s.code, s.nameAr, s.phone, s.taxNo].filter(Boolean).join(' '),
    keywords: [s.code, s.nameAr, s.phone, s.taxNo].filter(Boolean).join(' '),
  }));

  const handleRowClick = (row: SupplierStatementRow) => {
    if (row.route) router.push(row.route);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <ReportFilterField label="بحث عن مورد">
            <ListSearchAutocomplete
              value={search}
              onChange={setSearch}
              options={listSearchOptions}
              onDebouncedChange={searchSuppliers}
              placeholder="كود، اسم، هاتف، رقم ضريبي..."
              debounceMs={300}
              loading={pending}
            />
          </ReportFilterField>
          <ReportFilterField label="المورد">
            <AutocompleteSelect
              value={supplierId}
              onChange={setSupplierId}
              options={supplierOptions}
              placeholder="اختر مورداً..."
              emptyLabel="اختر مورداً..."
              className="min-w-[16rem]"
            />
          </ReportFilterField>
        </div>
        {!supplierId && suppliers.length === 0 ? (
          <p className="text-sm text-gray-500">لا يوجد موردون لديهم فواتير معتمدة/مرحّلة.</p>
        ) : null}
      </div>

      {supplierId ? (
        <ReportLayout
          title="كشف حساب المورد"
          subtitle="حركات المشتريات والمدفوعات"
          viewMode="grid"
          onViewModeChange={() => {}}
          onRefresh={() => loadStatement()}
          loading={pending}
          canExport={permissions.export}
          canPrint={permissions.print}
          canChart={false}
          exportFilename="supplier-statement"
          exportColumns={EXPORT_COLUMNS}
          exportRows={data.rows as unknown as Record<string, unknown>[]}
          summary={
            permissions.viewBalance
              ? [
                  { label: 'رصيد افتتاحي', value: formatCurrency(Number(data.summary.openingBalance ?? 0)) },
                  { label: 'إجمالي المشتريات', value: formatCurrency(Number(data.summary.totalPurchases ?? 0)) },
                  { label: 'إجمالي المرتجعات', value: formatCurrency(Number(data.summary.totalReturns ?? 0)) },
                  { label: 'إجمالي المدفوعات', value: formatCurrency(Number(data.summary.totalPayments ?? 0)) },
                  { label: 'رصيد ختامي', value: formatCurrency(Number(data.summary.closingBalance ?? 0)) },
                ]
              : [{ label: 'عدد الحركات', value: data.summary.movementCount ?? 0 }]
          }
          filters={
            <ReportFiltersBar
              onApply={() => loadStatement({ page: 1 })}
              onReset={() => {
                setDateFrom('');
                setDateTo('');
                setCurrencyId('');
                setPaymentStatus('');
                setMovementType('');
                setPage(1);
              }}
            >
              <ReportFilterField label="من تاريخ">
                <input type="date" className={reportInputClass()} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </ReportFilterField>
              <ReportFilterField label="إلى تاريخ">
                <input type="date" className={reportInputClass()} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </ReportFilterField>
              <ReportFilterField label="العملة">
                <select className={reportSelectClass()} value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
                  <option value="">الكل</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                  ))}
                </select>
              </ReportFilterField>
              <ReportFilterField label="حالة السداد">
                <select className={reportSelectClass()} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="">الكل</option>
                  <option value="unpaid">غير مسدد</option>
                  <option value="partial">مسدد جزئياً</option>
                  <option value="paid">مسدد</option>
                  <option value="overdue">متأخر</option>
                </select>
              </ReportFilterField>
              <ReportFilterField label="نوع الحركة">
                <select className={reportSelectClass()} value={movementType} onChange={(e) => setMovementType(e.target.value)}>
                  <option value="">الكل</option>
                  <option value="purchase">مشتريات</option>
                  <option value="payment">مدفوعات</option>
                </select>
              </ReportFilterField>
            </ReportFiltersBar>
          }
        >
          <ReportGrid
            columns={columns}
            rows={data.rows}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={handleRowClick}
          />
          {data.total > data.pageSize ? (
            <div className="flex justify-center gap-2 print:hidden">
              <button type="button" disabled={page <= 1} className="btn-secondary text-sm" onClick={() => loadStatement({ page: page - 1 })}>السابق</button>
              <span className="text-sm text-gray-600 py-2">صفحة {page}</span>
              <button type="button" disabled={page >= Math.ceil(data.total / data.pageSize)} className="btn-secondary text-sm" onClick={() => loadStatement({ page: page + 1 })}>التالي</button>
            </div>
          ) : null}
        </ReportLayout>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">اختر مورداً لعرض كشف الحساب.</p>
      )}
    </div>
  );
}
