'use client';

import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DOCUMENT_LABELS_AR } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface MatrixRow {
  id: string;
  documentType: string;
  level: number;
  minAmount?: number | null;
  maxAmount?: number | null;
  requiredApprovalsCount: number;
  approvalMode: string;
  isActive: boolean;
  branch?: { nameAr: string } | null;
  department?: { nameAr: string } | null;
  role?: { nameAr: string } | null;
}

export function ApprovalMatrixClient({ initialData }: { initialData: MatrixRow[] }) {
  const columns = [
    {
      key: 'documentType',
      label: 'نوع المستند',
      render: (row: Record<string, unknown>) =>
        DOCUMENT_LABELS_AR[row.documentType as string] || (row.documentType as string),
    },
    { key: 'level', label: 'المستوى' },
    {
      key: 'branch',
      label: 'الفرع',
      render: (row: Record<string, unknown>) =>
        (row.branch as { nameAr: string })?.nameAr || 'الكل',
    },
    {
      key: 'department',
      label: 'الإدارة',
      render: (row: Record<string, unknown>) =>
        (row.department as { nameAr: string })?.nameAr || 'الكل',
    },
    {
      key: 'role',
      label: 'الدور',
      render: (row: Record<string, unknown>) =>
        (row.role as { nameAr: string })?.nameAr || '-',
    },
    {
      key: 'minAmount',
      label: 'من مبلغ',
      render: (row: Record<string, unknown>) =>
        row.minAmount != null ? formatCurrency(row.minAmount as number) : '-',
    },
    {
      key: 'maxAmount',
      label: 'إلى مبلغ',
      render: (row: Record<string, unknown>) =>
        row.maxAmount != null ? formatCurrency(row.maxAmount as number) : '-',
    },
    {
      key: 'approvalMode',
      label: 'النمط',
      render: (row: Record<string, unknown>) =>
        row.approvalMode === 'Sequential' ? 'تسلسلي' : (row.approvalMode as string),
    },
    {
      key: 'isActive',
      label: 'الحالة',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={row.isActive ? 'Approved' : 'Cancelled'} />
      ),
    },
  ];

  return (
    <>
      <Header title="مصفوفة الاعتماد" subtitle="قواعد ومسارات اعتماد المستندات" />
      <PageContainer>
        <div className="card">
          {initialData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">لا توجد قواعد اعتماد مُعرّفة</p>
          ) : (
            <DataTable columns={columns} data={initialData as unknown as Record<string, unknown>[]} />
          )}
        </div>
      </PageContainer>
    </>
  );
}
