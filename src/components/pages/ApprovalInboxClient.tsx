'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchBox, SearchEmptyState } from '@/components/ui/SearchBox';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';
import { formatDateTime } from '@/lib/utils';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';

interface InboxItem {
  id: string;
  level: number;
  documentNo: string;
  waitingDays: number;
  approval: {
    id: string;
    documentType: string;
    documentId: string;
    status: string;
    requestedAt: string;
    requester?: { nameAr: string };
  };
}

export function ApprovalInboxClient({
  initialData,
  isAdmin = false,
}: {
  initialData: InboxItem[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => clientSearchMapped(initialData as unknown as Record<string, unknown>[], search, SEARCH_MAPPINGS.approval),
    [initialData, search]
  );

  const columns = [
    { key: 'documentNo', label: 'رقم المستند' },
    {
      key: 'documentType',
      label: 'نوع المستند',
      render: (row: Record<string, unknown>) => {
        const approval = row.approval as InboxItem['approval'];
        return DOCUMENT_LABELS_AR[approval.documentType] || approval.documentType;
      },
    },
    {
      key: 'requester',
      label: 'مقدم الطلب',
      render: (row: Record<string, unknown>) => {
        const approval = row.approval as InboxItem['approval'];
        return approval.requester?.nameAr || '-';
      },
    },
    {
      key: 'requestedAt',
      label: 'تاريخ الطلب',
      render: (row: Record<string, unknown>) => {
        const approval = row.approval as InboxItem['approval'];
        return formatDateTime(approval.requestedAt);
      },
    },
    {
      key: 'waitingDays',
      label: 'أيام الانتظار',
      render: (row: Record<string, unknown>) => `${row.waitingDays} يوم`,
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (row: Record<string, unknown>) => {
        const approval = row.approval as InboxItem['approval'];
        return <StatusBadge status={approval.status} />;
      },
    },
  ];

  const getDocumentUrl = (row: Record<string, unknown>) => {
    const approval = row.approval as InboxItem['approval'];
    const base = DOCUMENT_ROUTES[approval.documentType];
    return base ? `${base}/${approval.documentId}` : '#';
  };

  return (
    <>
      <Header
        title="صندوق الاعتمادات"
        subtitle={
          isAdmin
            ? 'جميع المستندات المعلقة في النظام (عرض المدير)'
            : 'المستندات المعلقة بانتظار اعتمادك'
        }
      />
      <PageContainer>
        <div className="card mb-4">
          <SearchBox value={search} onChange={setSearch} placeholder="بحث برقم المستند أو نوعه أو مقدم الطلب..." />
        </div>
        <div className="card">
          {initialData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">لا توجد مستندات معلقة</p>
          ) : filtered.length === 0 ? (
            <SearchEmptyState query={search} message="لا توجد مستندات مطابقة" />
          ) : (
            <DataTable
              columns={columns}
              data={filtered as unknown as Record<string, unknown>[]}
              onRowClick={(row) => {
                router.push(getDocumentUrl(row));
              }}
            />
          )}
        </div>
      </PageContainer>
    </>
  );
}
