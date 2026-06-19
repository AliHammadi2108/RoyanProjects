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
import { formatDate, formatDocumentCurrency } from '@/lib/utils';
import { deletePurchaseRequest } from '@/actions/purchase-requests';
import { useOperationToast } from '@/hooks/useOperationToast';
import {
  isOpenStandardDocument,
  OPEN_FILTER_PARAM,
  type PurchaseListFilter,
} from '@/lib/purchase-open-filter';

const STATUS_FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'Draft', label: 'مسودة' },
  { value: 'Pending Approval', label: 'بانتظار الاعتماد' },
  { value: 'Approved', label: 'معتمد' },
  { value: 'Rejected', label: 'مرفوض' },
  { value: 'Returned For Edit', label: 'مرجع للتعديل' },
];

type RequestRow = Record<string, unknown> & {
  id: string;
  documentNo: string;
  status: string;
};

export function PurchaseRequestsClient({
  initialData,
  usageMap = {},
  initialFilter = '',
}: {
  initialData: RequestRow[];
  usageMap?: Record<string, UsedDocumentInfo>;
  initialFilter?: PurchaseListFilter;
}) {
  const router = useRouter();
  const { showDeleteSuccess } = useOperationToast();
  const openOnly = initialFilter === OPEN_FILTER_PARAM;
  const [statusFilter, setStatusFilter] = useState('');
  const [usedFilter, setUsedFilter] = useState<'' | 'used' | 'unused'>('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    let rows = clientSearch(initialData, search, [
      (r) => SEARCH_MAPPINGS.purchaseRequest(r).join(' '),
    ]);
    return rows.filter((row) => {
      if (openOnly && !isOpenStandardDocument(row.status, usageMap[row.id])) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      const used = usageMap[row.id]?.isUsed;
      if (usedFilter === 'used' && !used) return false;
      if (usedFilter === 'unused' && used) return false;
      return true;
    });
  }, [initialData, openOnly, statusFilter, usedFilter, search, usageMap]);

  const canEdit = (row: RequestRow) =>
    ['Draft', 'Returned For Edit'].includes(row.status) && !usageMap[row.id]?.isUsed;
  const canDelete = (row: RequestRow) =>
    row.status === 'Draft' && !usageMap[row.id]?.isUsed;

  const handleDelete = async (id: string, documentNo: string) => {
    if (!confirm(`هل تريد حذف طلب الشراء ${documentNo}؟`)) return;
    setDeletingId(id);
    setError('');
    try {
      await deletePurchaseRequest(id);
      showDeleteSuccess();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Header
        title="طلبات الشراء"
        subtitle="APST001 - إدارة طلبات الشراء الداخلية"
        actions={
          <Link href="/purchases/requests/new" className="btn-primary">
            <Plus className="w-4 h-4" /> طلب شراء جديد
          </Link>
        }
      />
      <PageContainer>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        {openOnly && (
          <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-800">
            عرض العمليات المفتوحة فقط —{' '}
            <Link href="/purchases/requests" className="underline hover:text-primary-900">
              إزالة الفلتر
            </Link>
          </div>
        )}

        <div className="card mb-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <List className="w-4 h-4" />
              <span>إجمالي الطلبات: <strong>{initialData.length}</strong></span>
              {(statusFilter || openOnly) && (
                <span className="text-primary-600">| المعروض: <strong>{filtered.length}</strong></span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="بحث برقم الطلب أو الإدارة..."
              />
              <select
                className="form-input text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <UsedFilterSelect value={usedFilter} onChange={setUsedFilter} />
            </div>
          </div>
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <SearchEmptyState query={search} />
              {!search && !statusFilter && !usedFilter && (
                <>
                  <p className="mb-4">لا توجد طلبات شراء محفوظة</p>
                  <Link href="/purchases/requests/new" className="btn-primary inline-flex">
                    <Plus className="w-4 h-4" /> إنشاء أول طلب شراء
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['رقم الطلب', 'الفرع', 'الإدارة', 'الحالة', 'التاريخ', 'المبلغ', 'المُنشئ', 'الإجراءات'].map((h) => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {row.documentNo}
                          <UsedDocumentBadge usage={usageMap[row.id]} compact />
                        </div>
                      </td>
                      <td className="px-4 py-3">{(row.branch as { nameAr: string })?.nameAr || '-'}</td>
                      <td className="px-4 py-3">{(row.department as { nameAr: string })?.nameAr || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">{formatDate(row.requestDate as string)}</td>
                      <td className="px-4 py-3">
                        {formatDocumentCurrency(
                          row.totalAmount as number,
                          row.currency as { symbol?: string; code?: string } | undefined
                        )}
                      </td>
                      <td className="px-4 py-3">{(row.creator as { nameAr: string })?.nameAr || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/purchases/requests/${row.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                            title="عرض"
                          >
                            <Eye className="w-3.5 h-3.5" /> عرض
                          </Link>
                          {canEdit(row) && (
                            <Link
                              href={`/purchases/requests/${row.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                              title="تعديل"
                            >
                              <Pencil className="w-3.5 h-3.5" /> تعديل
                            </Link>
                          )}
                          {canDelete(row) && (
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => handleDelete(row.id, row.documentNo)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
