'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { processStructuredApprovalRequest } from '@/actions/access-control';
import { formatCurrency } from '@/lib/utils';

interface RequestRow {
  id: string;
  module: string;
  operationType: string;
  referenceId: string;
  status: string;
  level: number;
  amount?: number | null;
  notes?: string | null;
  requester?: { nameAr: string };
  currency?: { code: string } | null;
}

export function ApprovalRequestsClient({ initialData }: { initialData: RequestRow[] }) {
  const [rows, setRows] = useState(initialData);
  const [error, setError] = useState('');

  const act = async (requestId: string, action: 'approve' | 'reject' | 'return_for_edit' | 'cancel') => {
    setError('');
    try {
      await processStructuredApprovalRequest({ requestId, action });
      setRows((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التنفيذ');
    }
  };

  const columns = [
    { key: 'module', label: 'الوحدة' },
    { key: 'operationType', label: 'العملية' },
    {
      key: 'requester',
      label: 'مقدم الطلب',
      render: (row: Record<string, unknown>) => (row.requester as { nameAr: string })?.nameAr || '-',
    },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (row: Record<string, unknown>) =>
        row.amount != null ? formatCurrency(row.amount as number) : '-',
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row: Record<string, unknown>) => <StatusBadge status={row.status as string} />,
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button type="button" className="text-green-600 text-xs" onClick={() => act(row.id as string, 'approve')}>اعتماد</button>
          <button type="button" className="text-red-600 text-xs" onClick={() => act(row.id as string, 'reject')}>رفض</button>
          <button type="button" className="text-amber-600 text-xs" onClick={() => act(row.id as string, 'return_for_edit')}>إرجاع</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="طلبات الاعتماد" subtitle="الطلبات المعلقة" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <DataTable columns={columns} data={rows as unknown as Record<string, unknown>[]} />
      </PageContainer>
    </>
  );
}
