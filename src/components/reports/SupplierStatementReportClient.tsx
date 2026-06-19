'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
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
import { formatDate, formatReportAmount, formatReportSummaryAmount, resolveCurrencyById, type CurrencyLike } from '@/lib/utils';
import { filterCurrenciesForSupplier } from '@/lib/supplier-currency';
import type {
  SupplierStatementResult,
  SupplierStatementRow,
} from '@/services/reports/types';

interface SupplierOption {
  id: string;
  code: string;
  nameAr: string;
  phone?: string | null;
  taxNo?: string | null;
  invoiceCount: number;
  defaultCurrencyId?: string | null;
  currencyIds?: string[];
}

interface SupplierStatementReportClientProps {
  suppliers: SupplierOption[];
  currencies: { id: string; code: string; nameAr: string; symbol?: string }[];
  baseCurrency?: CurrencyLike;
  permissions: { export: boolean; print: boolean; viewBalance: boolean };
  printedBy?: string;
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

const EMPTY_DATA: SupplierStatementResult = {
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
  baseCurrency,
  permissions,
  printedBy,
}: SupplierStatementReportClientProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState('');
  const [data, setData] = useState<SupplierStatementResult>(EMPTY_DATA);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [showInBaseCurrency, setShowInBaseCurrency] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [movementType, setMovementType] = useState('');
  const [sortBy, setSortBy] = useState('movementDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId]
  );
  const supplierCurrencyOptions = useMemo(() => {
    if (!selectedSupplier) return currencies;
    return filterCurrenciesForSupplier(currencies, {
      id: selectedSupplier.id,
      defaultCurrencyId: selectedSupplier.defaultCurrencyId,
      currencies: (selectedSupplier.currencyIds || []).map((currencyId) => ({
        currencyId,
        isDefault: currencyId === selectedSupplier.defaultCurrencyId,
      })),
    });
  }, [currencies, selectedSupplier]);

  const handleSupplierSelect = (id: string) => {
    setSupplierId(id);
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) {
      setCurrencyId('');
      return;
    }
    const allowed = supplier.currencyIds?.length
      ? supplier.currencyIds
      : supplier.defaultCurrencyId
        ? [supplier.defaultCurrencyId]
        : [];
    if (currencyId && !allowed.includes(currencyId)) {
      setCurrencyId(supplier.defaultCurrencyId || allowed[0] || '');
    }
  };

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
          currencyId: showInBaseCurrency ? undefined : currencyId || undefined,
          paymentStatus: paymentStatus || undefined,
          movementType: movementType || undefined,
          showInBaseCurrency,
          page: overrides?.page ?? page,
          sortBy: overrides?.sortBy ?? sortBy,
          sortDir: overrides?.sortDir ?? sortDir,
        });
        setData(result);
        if (overrides?.page) setPage(overrides.page);
      });
    },
    [supplierId, dateFrom, dateTo, currencyId, showInBaseCurrency, paymentStatus, movementType, page, sortBy, sortDir]
  );

  const displayCurrency = useMemo(() => {
    if (data.showInBaseCurrency) return baseCurrency;
    return resolveCurrencyById(currencies, currencyId) ?? baseCurrency;
  }, [data.showInBaseCurrency, currencies, currencyId, baseCurrency]);

  const hasSections = Boolean(data.sections && data.sections.length > 0);

  const exportRows = useMemo(() => {
    if (hasSections && data.sections) {
      return data.sections.flatMap((section) =>
        section.rows.map((row) => ({ ...row } as Record<string, unknown>))
      );
    }
    return data.rows as unknown as Record<string, unknown>[];
  }, [data.rows, data.sections, hasSections]);

  const buildSummaryItems = (summary: SupplierStatementResult['summary'], currency = displayCurrency) =>
    permissions.viewBalance
      ? [
          { label: 'رصيد افتتاحي', value: formatReportSummaryAmount(Number(summary.openingBalance ?? 0), currency) },
          { label: 'إجمالي المشتريات', value: formatReportSummaryAmount(Number(summary.totalPurchases ?? 0), currency) },
          { label: 'إجمالي المرتجعات', value: formatReportSummaryAmount(Number(summary.totalReturns ?? 0), currency) },
          { label: 'إجمالي المدفوعات', value: formatReportSummaryAmount(Number(summary.totalPayments ?? 0), currency) },
          { label: 'رصيد ختامي', value: formatReportSummaryAmount(Number(summary.closingBalance ?? 0), currency) },
        ]
      : [{ label: 'عدد الحركات', value: summary.movementCount ?? 0 }];

  const formatRowAmount = (amount: number, row: SupplierStatementRow) => {
    const rowCurrency = data.showInBaseCurrency
      ? baseCurrency
      : resolveCurrencyById(currencies, row.currencyId) ?? { code: row.currencyCode };
    return formatReportAmount(amount, rowCurrency?.code ?? row.currencyCode, baseCurrency);
  };

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
              row.debit > 0 ? formatRowAmount(row.debit, row) : '-',
          },
          {
            key: 'credit',
            label: 'دائن',
            sortable: true,
            render: (row: SupplierStatementRow) =>
              row.credit > 0 ? formatRowAmount(row.credit, row) : '-',
          },
          {
            key: 'balance',
            label: 'الرصيد',
            sortable: true,
            render: (row: SupplierStatementRow) => formatRowAmount(row.balance, row),
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
              onChange={handleSupplierSelect}
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
          subtitle={
            showInBaseCurrency
              ? `عرض موحّد بالعملة الأساسية (${baseCurrency?.code || data.baseCurrencyCode || '—'})`
              : hasSections
                ? 'كشف منفصل لكل عملة'
                : 'حركات المشتريات والمدفوعات'
          }
          viewMode="grid"
          onViewModeChange={() => {}}
          onRefresh={() => loadStatement()}
          loading={pending}
          canExport={permissions.export}
          canPrint={permissions.print}
          printedBy={printedBy}
          canChart={false}
          exportFilename="supplier-statement"
          exportColumns={EXPORT_COLUMNS}
          exportRows={exportRows}
          summary={hasSections ? undefined : buildSummaryItems(data.summary)}
          filters={
            <ReportFiltersBar
              onApply={() => loadStatement({ page: 1 })}
              onReset={() => {
                setDateFrom('');
                setDateTo('');
                setCurrencyId('');
                setShowInBaseCurrency(false);
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
                <select
                  className={reportSelectClass()}
                  value={currencyId}
                  disabled={showInBaseCurrency}
                  onChange={(e) => setCurrencyId(e.target.value)}
                >
                  <option value="">الكل (كشف لكل عملة)</option>
                  {supplierCurrencyOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                  ))}
                </select>
              </ReportFilterField>
              <ReportFilterField label="عرض">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer min-h-[2.25rem]">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={showInBaseCurrency}
                    onChange={(e) => {
                      setShowInBaseCurrency(e.target.checked);
                      if (e.target.checked) setCurrencyId('');
                    }}
                  />
                  <span>عرض بالعملة الأساسية</span>
                </label>
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
          {hasSections && data.sections ? (
            <div className="space-y-6">
              {data.sections.map((section) => {
                const sectionCurrency =
                  resolveCurrencyById(currencies, section.currencyId) ?? {
                    code: section.currencyCode,
                    nameAr: section.currencyNameAr,
                  };
                return (
                  <div key={section.currencyId} className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 border-b pb-2">
                      كشف بالعملة: {section.currencyNameAr || section.currencyCode}
                      {' '}({section.currencyCode})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {buildSummaryItems(section.summary, sectionCurrency).map((item) => (
                        <div key={item.label} className="card border-r-4 border-r-primary-500 py-3">
                          <p className="text-xs text-gray-500">{item.label}</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <ReportGrid
                      columns={columns}
                      rows={section.rows}
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      onRowClick={handleRowClick}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <ReportGrid
                columns={columns}
                rows={data.rows}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                onRowClick={handleRowClick}
              />
              {!hasSections && data.total > data.pageSize ? (
                <div className="flex justify-center gap-2 print:hidden">
                  <button type="button" disabled={page <= 1} className="btn-secondary text-sm" onClick={() => loadStatement({ page: page - 1 })}>السابق</button>
                  <span className="text-sm text-gray-600 py-2">صفحة {page}</span>
                  <button type="button" disabled={page >= Math.ceil(data.total / data.pageSize)} className="btn-secondary text-sm" onClick={() => loadStatement({ page: page + 1 })}>التالي</button>
                </div>
              ) : null}
            </>
          )}
        </ReportLayout>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">اختر مورداً لعرض كشف الحساب.</p>
      )}
    </div>
  );
}
