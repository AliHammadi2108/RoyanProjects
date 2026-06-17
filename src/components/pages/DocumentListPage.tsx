'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';

interface DocumentListPageProps {
  title: string;
  subtitle?: string;
  createHref?: string;
  createLabel?: string;
  columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }>;
  data: Record<string, unknown>[];
  basePath: string;
  filters?: React.ReactNode;
}

export function DocumentListPage({
  title,
  subtitle,
  createHref,
  createLabel = 'إنشاء جديد',
  columns,
  data,
  basePath,
  filters,
}: DocumentListPageProps) {
  return (
    <>
      <Header
        title={title}
        subtitle={subtitle}
        actions={
          createHref ? (
            <Link href={createHref} className="btn-primary">
              <Plus className="w-4 h-4" />
              {createLabel}
            </Link>
          ) : undefined
        }
      />
      <PageContainer>
        {filters && <div className="card">{filters}</div>}
        <div className="card">
          <DataTable
            columns={columns}
            data={data}
            onRowClick={(row) => {
              window.location.href = `${basePath}/${row.id}`;
            }}
          />
        </div>
      </PageContainer>
    </>
  );
}

export const defaultDocColumns = [
  { key: 'documentNo', label: 'رقم المستند' },
  {
    key: 'status',
    label: 'الحالة',
    render: (row: Record<string, unknown>) => <StatusBadge status={row.status as string} />,
  },
  {
    key: 'createdAt',
    label: 'التاريخ',
    render: (row: Record<string, unknown>) => formatDate(row.createdAt as string),
  },
  {
    key: 'totalAmount',
    label: 'المبلغ',
    render: (row: Record<string, unknown>) =>
      formatCurrency((row.totalAmount as number) || (row.total as number) || 0),
  },
];
