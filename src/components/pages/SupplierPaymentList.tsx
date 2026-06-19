'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SearchBox } from '@/components/ui/SearchBox';
import { formatDocumentCurrency, formatDate } from '@/lib/utils';
import { removeSupplierPayment } from '@/actions/supplier-payments';
import { useOperationToast } from '@/hooks/useOperationToast';

interface PaymentRow {
  id: string;
  documentNo: string;
  status: string;
  paymentDate: string;
  totalAmount: number;
  supplier: { nameAr: string; code: string };
  branch: { nameAr: string };
  currency?: { symbol?: string | null; code?: string | null } | null;
}

interface SupplierPaymentListProps {
  data: PaymentRow[];
  canCreate?: boolean;
  canViewAmounts?: boolean;
}

export function SupplierPaymentList({ data, canCreate, canViewAmounts }: SupplierPaymentListProps) {
  const router = useRouter();
  const { showDeleteSuccess } = useOperationToast();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.documentNo || '').toLowerCase().includes(q) ||
          String(r.supplier?.nameAr || '').toLowerCase().includes(q) ||
          String(r.supplier?.code || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, search]);

  const handleDelete = async (id: string, documentNo: string) => {
    if (!confirm(`حذف سند الصرف ${documentNo}؟`)) return;
    try {
      await removeSupplierPayment(id);
      showDeleteSuccess();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <>
      <Header
        title="سندات صرف الموردين"
        subtitle="إدارة مدفوعات الموردين وتخصيصها على الفواتير"
        actions={
          canCreate ? (
            <Link href="/purchases/supplier-payments/new" className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> سند صرف جديد
            </Link>
          ) : undefined
        }
      />
      <PageContainer>
        <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="بحث برقم السند أو المورد..." />
        </div>

        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>رقم السند</th>
                <th>المورد</th>
                <th>الفرع</th>
                <th>التاريخ</th>
                {canViewAmounts ? <th>المبلغ</th> : null}
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canViewAmounts ? 6 : 5} className="text-center text-gray-500 py-8">
                    لا توجد سندات صرف
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.documentNo}</td>
                    <td>{row.supplier.nameAr}</td>
                    <td>{row.branch.nameAr}</td>
                    <td>{formatDate(row.paymentDate)}</td>
                    {canViewAmounts ? (
                      <td>{formatDocumentCurrency(row.totalAmount, row.currency)}</td>
                    ) : null}
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/purchases/supplier-payments/${row.id}`} className="p-1.5 rounded hover:bg-gray-100" title="عرض">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {row.status === 'Draft' ? (
                          <>
                            <Link href={`/purchases/supplier-payments/${row.id}`} className="p-1.5 rounded hover:bg-gray-100" title="تعديل">
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button type="button" className="p-1.5 rounded hover:bg-red-50 text-red-600" title="حذف" onClick={() => handleDelete(row.id, row.documentNo)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </>
  );
}
