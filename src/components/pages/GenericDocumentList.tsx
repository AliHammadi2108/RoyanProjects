'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2, List } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchBox, SearchEmptyState } from '@/components/ui/SearchBox';
import { UsedDocumentBadge, UsedFilterSelect, type UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';
import { clientSearch, SEARCH_MAPPINGS } from '@/lib/search';
import { formatDate, formatCurrency } from '@/lib/utils';
import { EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';

type ColumnDef = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type DocumentListVariant =
  | 'quotation'
  | 'comparison'
  | 'nomination'
  | 'order'
  | 'inspection'
  | 'receiving'
  | 'invoice';

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'Draft', label: 'مسودة' },
  { value: 'Pending Approval', label: 'بانتظار الاعتماد' },
  { value: 'Approved', label: 'معتمد' },
  { value: 'Rejected', label: 'مرفوض' },
  { value: 'Returned For Edit', label: 'مرجع للتعديل' },
];

const VARIANT_CONFIG: Record<
  DocumentListVariant,
  {
    title: string;
    subtitle: string;
    createHref: string;
    createLabel: string;
    basePath: string;
    statusField: string;
    documentNoField: string;
    columns: ColumnDef[];
    canEdit: (row: Record<string, unknown>) => boolean;
    canDelete: (row: Record<string, unknown>) => boolean;
  }
> = {
  quotation: {
    title: 'عروض الأسعار',
    subtitle: 'APST002 - إدارة عروض أسعار الموردين',
    createHref: '/purchases/quotations/new',
    createLabel: 'عرض سعر جديد',
    basePath: '/purchases/quotations',
    statusField: 'status',
    documentNoField: 'documentNo',
    canEdit: (row) => EDITABLE_DOC_STATUSES.includes(row.status as string),
    canDelete: (row) => row.status === 'Draft',
    columns: [
      { key: 'documentNo', label: 'رقم العرض' },
      {
        key: 'purchaseRequest',
        label: 'طلب الشراء',
        render: (row) => (row.purchaseRequest as { documentNo: string })?.documentNo || '-',
      },
      {
        key: 'supplier',
        label: 'المورد',
        render: (row) => (row.supplier as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => <StatusBadge status={row.status as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
      {
        key: 'total',
        label: 'المبلغ',
        render: (row) => formatCurrency(row.total as number),
      },
    ],
  },
  comparison: {
    title: 'المقارنة الفنية',
    subtitle: 'APST020 - مقارنة عروض الأسعار',
    createHref: '/purchases/comparisons/new',
    createLabel: 'مقارنة جديدة',
    basePath: '/purchases/comparisons',
    statusField: 'status',
    documentNoField: 'documentNo',
    canEdit: (row) => EDITABLE_DOC_STATUSES.includes(row.status as string),
    canDelete: (row) => row.status === 'Draft',
    columns: [
      { key: 'documentNo', label: 'رقم المقارنة' },
      {
        key: 'branch',
        label: 'الفرع',
        render: (row) => (row.branch as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => <StatusBadge status={row.status as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
      {
        key: 'totalAmount',
        label: 'المبلغ',
        render: (row) => formatCurrency(row.totalAmount as number),
      },
      {
        key: 'creator',
        label: 'المُنشئ',
        render: (row) => (row.creator as { nameAr: string })?.nameAr || '-',
      },
    ],
  },
  nomination: {
    title: 'اختيار المورد',
    subtitle: 'APST021 - ترشيح المورد الفائز',
    createHref: '/purchases/supplier-selection/new',
    createLabel: 'ترشيح جديد',
    basePath: '/purchases/supplier-selection',
    statusField: 'status',
    documentNoField: 'documentNo',
    canEdit: (row) => EDITABLE_DOC_STATUSES.includes(row.status as string),
    canDelete: (row) => row.status === 'Draft',
    columns: [
      { key: 'documentNo', label: 'رقم الترشيح' },
      {
        key: 'supplier',
        label: 'المورد',
        render: (row) => (row.supplier as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'technicalComparison',
        label: 'المقارنة',
        render: (row) =>
          (row.technicalComparison as { documentNo: string })?.documentNo || '-',
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => <StatusBadge status={row.status as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
      {
        key: 'totalAmount',
        label: 'المبلغ',
        render: (row) => formatCurrency(row.totalAmount as number),
      },
    ],
  },
  order: {
    title: 'أوامر الشراء',
    subtitle: 'APST003 - إدارة أوامر الشراء',
    createHref: '/purchases/orders/new',
    createLabel: 'أمر شراء جديد',
    basePath: '/purchases/orders',
    statusField: 'status',
    documentNoField: 'documentNo',
    canEdit: (row) => EDITABLE_DOC_STATUSES.includes(row.status as string),
    canDelete: (row) => row.status === 'Draft',
    columns: [
      { key: 'documentNo', label: 'رقم الأمر' },
      {
        key: 'supplier',
        label: 'المورد',
        render: (row) => (row.supplier as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => <StatusBadge status={row.status as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
      {
        key: 'total',
        label: 'المبلغ',
        render: (row) => formatCurrency(row.total as number),
      },
      {
        key: 'creator',
        label: 'المُنشئ',
        render: (row) => (row.creator as { nameAr: string })?.nameAr || '-',
      },
    ],
  },
  inspection: {
    title: 'فحص المشتريات',
    subtitle: 'APST014 - فحص البضائع الواردة',
    createHref: '/purchases/inspections/new',
    createLabel: 'فحص جديد',
    basePath: '/purchases/inspections',
    statusField: 'inspectionResult',
    documentNoField: 'documentNo',
    canEdit: () => false,
    canDelete: () => true,
    columns: [
      { key: 'documentNo', label: 'رقم الفحص' },
      {
        key: 'purchaseOrder',
        label: 'أمر الشراء',
        render: (row) =>
          (row.purchaseOrder as { documentNo: string })?.documentNo || '-',
      },
      {
        key: 'supplier',
        label: 'المورد',
        render: (row) => (row.supplier as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'inspectionResult',
        label: 'نتيجة الفحص',
        render: (row) => <StatusBadge status={row.inspectionResult as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
    ],
  },
  receiving: {
    title: 'إذن التوريد',
    subtitle: 'APST004 - استلام البضائع',
    createHref: '/purchases/receivings/new',
    createLabel: 'إذن توريد جديد',
    basePath: '/purchases/receivings',
    statusField: 'receivingStatus',
    documentNoField: 'documentNo',
    canEdit: () => false,
    canDelete: () => true,
    columns: [
      { key: 'documentNo', label: 'رقم الإذن' },
      {
        key: 'purchaseOrder',
        label: 'أمر الشراء',
        render: (row) =>
          (row.purchaseOrder as { documentNo: string })?.documentNo || '-',
      },
      {
        key: 'supplier',
        label: 'المورد',
        render: (row) => (row.supplier as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'receivingStatus',
        label: 'حالة الاستلام',
        render: (row) => <StatusBadge status={row.receivingStatus as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
    ],
  },
  invoice: {
    title: 'فواتير المشتريات',
    subtitle: 'APST005 - فواتير الموردين',
    createHref: '/purchases/invoices/new',
    createLabel: 'فاتورة جديدة',
    basePath: '/purchases/invoices',
    statusField: 'status',
    documentNoField: 'documentNo',
    canEdit: (row) => row.status === 'Draft',
    canDelete: (row) => row.status === 'Draft',
    columns: [
      { key: 'documentNo', label: 'رقم الفاتورة' },
      {
        key: 'purchaseOrder',
        label: 'أمر الشراء',
        render: (row) =>
          (row.purchaseOrder as { documentNo: string })?.documentNo || '-',
      },
      {
        key: 'supplier',
        label: 'المورد',
        render: (row) => (row.supplier as { nameAr: string })?.nameAr || '-',
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => <StatusBadge status={row.status as string} />,
      },
      {
        key: 'createdAt',
        label: 'التاريخ',
        render: (row) => formatDate(row.createdAt as string),
      },
      {
        key: 'netTotal',
        label: 'صافي المبلغ',
        render: (row) => formatCurrency(row.netTotal as number),
      },
    ],
  },
};

interface GenericDocumentListProps {
  variant: DocumentListVariant;
  data: Record<string, unknown>[];
  onDelete?: (id: string) => Promise<unknown>;
  usageMap?: Record<string, UsedDocumentInfo>;
}

const SEARCH_EXTRA: Partial<Record<DocumentListVariant, string[]>> = {
  quotation: ['referenceNo'],
  order: ['operationNo'],
};

export function GenericDocumentList({ variant, data, onDelete, usageMap = {} }: GenericDocumentListProps) {
  const config = VARIANT_CONFIG[variant];
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [usedFilter, setUsedFilter] = useState<'' | 'used' | 'unused'>('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    let rows = data;
    if (search) {
      rows = clientSearch(rows, search, [
        (row) => SEARCH_MAPPINGS.document(row, SEARCH_EXTRA[variant] || []).join(' '),
      ]);
    }
    return rows.filter((row) => {
      const status = row[config.statusField] as string;
      if (statusFilter && status !== statusFilter) return false;
      const id = row.id as string;
      const used = usageMap[id]?.isUsed;
      if (usedFilter === 'used' && !used) return false;
      if (usedFilter === 'unused' && used) return false;
      return true;
    });
  }, [data, statusFilter, usedFilter, search, config, usageMap]);

  const isRowEditable = (row: Record<string, unknown>) =>
    config.canEdit(row) && !usageMap[row.id as string]?.isUsed;

  const isRowDeletable = (row: Record<string, unknown>) =>
    config.canDelete(row) && !usageMap[row.id as string]?.isUsed;

  const handleDelete = async (id: string, documentNo: string) => {
    if (!onDelete) return;
    if (!confirm(`هل تريد حذف ${documentNo}؟`)) return;
    setDeletingId(id);
    setError('');
    try {
      await onDelete(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  const showStatusFilter = ['quotation', 'comparison', 'nomination', 'order', 'invoice'].includes(variant);

  return (
    <>
      <Header
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Link href={config.createHref} className="btn-primary">
            <Plus className="w-4 h-4" />
            {config.createLabel}
          </Link>
        }
      />
      <PageContainer>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="card mb-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <List className="w-4 h-4" />
              <span>
                إجمالي العمليات: <strong>{data.length}</strong>
              </span>
              {(statusFilter || search) && (
                <span className="text-primary-600">
                  | المعروض: <strong>{filtered.length}</strong>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="بحث برقم المستند أو المورد..."
              />
              {showStatusFilter && (
                <select
                  className="form-input text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
              <UsedFilterSelect value={usedFilter} onChange={setUsedFilter} />
            </div>
          </div>
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <SearchEmptyState query={search} message="لا توجد عمليات مطابقة" />
              {!search && !usedFilter && !statusFilter && (
                <>
                  <p className="mb-4">لا توجد عمليات محفوظة</p>
                  <Link href={config.createHref} className="btn-primary inline-flex">
                    <Plus className="w-4 h-4" /> {config.createLabel}
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {config.columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-right text-xs font-semibold text-gray-600"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((row) => {
                    const id = row.id as string;
                    const docNo = row[config.documentNoField] as string;
                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        {config.columns.map((col) => (
                          <td key={col.key} className="px-4 py-3">
                            {col.key === config.documentNoField ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                                <UsedDocumentBadge usage={usageMap[id]} compact />
                              </div>
                            ) : col.render ? (
                              col.render(row)
                            ) : (
                              String(row[col.key] ?? '-')
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link
                              href={`${config.basePath}/${id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              <Eye className="w-3.5 h-3.5" /> عرض
                            </Link>
                            {isRowEditable(row) && (
                              <Link
                                href={`${config.basePath}/${id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                              >
                                <Pencil className="w-3.5 h-3.5" /> تعديل
                              </Link>
                            )}
                            {onDelete && isRowDeletable(row) && (
                              <button
                                type="button"
                                disabled={deletingId === id}
                                onClick={() => handleDelete(id, docNo)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> حذف
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
