'use client';

import { useCallback, useState, useTransition } from 'react';
import { fetchQuantityCostReport } from '@/actions/reports';
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
import type { QuantityCostRow, ReportResult } from '@/services/reports/types';
import type { ReportViewMode } from '@/components/reports/ReportViewToggle';

interface QuantityCostReportClientProps {
  initialData: ReportResult<QuantityCostRow>;
  filterOptions: {
    suppliers: { id: string; nameAr: string }[];
    warehouses: { id: string; nameAr: string }[];
    items: { id: string; code: string; nameAr: string }[];
  };
  permissions: { export: boolean; print: boolean; charts: boolean; viewCost: boolean };
}

export function QuantityCostReportClient({
  initialData,
  filterOptions,
  permissions,
}: QuantityCostReportClientProps) {
  const [data, setData] = useState(initialData);
  const [viewMode, setViewMode] = useState<ReportViewMode>('grid');
  const [pending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchQuantityCostReport({
        supplierId: supplierId || undefined,
        warehouseId: warehouseId || undefined,
        itemId: itemId || undefined,
        search: search || undefined,
      });
      setData(result);
    });
  }, [supplierId, warehouseId, itemId, search]);

  const columns: ReportGridColumn<QuantityCostRow>[] = [
    { key: 'itemCode', label: 'كود الصنف' },
    { key: 'itemName', label: 'الصنف' },
    { key: 'orderedBaseQty', label: 'كمية أمر', render: (r) => r.orderedBaseQty.toLocaleString('ar-SA') },
    { key: 'receivedBaseQty', label: 'كمية مستلمة', render: (r) => r.receivedBaseQty.toLocaleString('ar-SA') },
    { key: 'invoicedBaseQty', label: 'كمية مفوترة', render: (r) => r.invoicedBaseQty.toLocaleString('ar-SA') },
    { key: 'varianceQty', label: 'فرق الكمية', render: (r) => r.varianceQty.toLocaleString('ar-SA') },
    ...(permissions.viewCost
      ? [
          { key: 'orderedCost', label: 'تكلفة أمر', render: (r: QuantityCostRow) => formatCurrency(r.orderedCost) },
          { key: 'invoicedCost', label: 'تكلفة فاتورة', render: (r: QuantityCostRow) => formatCurrency(r.invoicedCost) },
          { key: 'varianceCost', label: 'فرق التكلفة', render: (r: QuantityCostRow) => formatCurrency(r.varianceCost) },
        ]
      : []),
  ];

  return (
    <ReportLayout
      title="تقرير مقارنة الكميات والتكاليف"
      subtitle="مقارنة الكميات والتكاليف بين الأمر والتوريد والفاتورة (base_qty و exchange_rate المخزنة)"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onRefresh={load}
      loading={pending}
      canExport={permissions.export}
      canPrint={permissions.print}
      canChart={permissions.charts}
      exportFilename="quantity-cost"
      exportColumns={columns.map((c) => ({ key: c.key, label: c.label }))}
      exportRows={data.rows as unknown as Record<string, unknown>[]}
      summary={[
        { label: 'عدد الأصناف', value: data.summary.itemCount ?? 0 },
        { label: 'إجمالي كمية الأمر', value: Number(data.summary.totalOrderedQty ?? 0).toLocaleString('ar-SA') },
        { label: 'إجمالي فرق الكمية', value: Number(data.summary.totalVarianceQty ?? 0).toLocaleString('ar-SA') },
      ]}
      filters={
        <ReportFiltersBar onApply={load} onReset={() => { setSupplierId(''); setWarehouseId(''); setItemId(''); setSearch(''); }}>
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
            <input className={reportInputClass()} value={search} onChange={(e) => setSearch(e.target.value)} />
          </ReportFilterField>
        </ReportFiltersBar>
      }
    >
      {viewMode === 'grid' ? (
        <ReportGrid columns={columns} rows={data.rows} />
      ) : (
        <ReportCharts data={data.chartData} title="أكبر فروقات الكمية" />
      )}
    </ReportLayout>
  );
}
