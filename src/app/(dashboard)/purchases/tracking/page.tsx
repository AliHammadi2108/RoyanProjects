import type { ComponentProps } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer, StatCard } from '@/components/layout/PageContainer';
import { TrackingClient } from '@/components/pages/TrackingClient';
import { fetchTrackingStats, fetchTrackingList } from '@/actions/common';
import { getCurrentUser } from '@/lib/permissions';
import { getAccessibleHrefs } from '@/lib/screen-access';
import { serializeForClient } from '@/lib/serialize-client';

export default async function TrackingPage() {
  const user = await getCurrentUser();
  const [stats, cycles, allowedHrefs] = await Promise.all([
    fetchTrackingStats(),
    fetchTrackingList(),
    user ? getAccessibleHrefs(user.id) : Promise.resolve([]),
  ]);

  const initialCycles = serializeForClient(cycles) as ComponentProps<
    typeof TrackingClient
  >['initialCycles'];

  return (
    <>
      <Header
        title="متابعة دورة المشتريات"
        subtitle="عرض الدورات الجارية ومراحل سير العمل"
      />
      <PageContainer>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="طلبات الشراء" {...stats.purchaseRequests} color="primary" />
          <StatCard title="عروض الأسعار" {...stats.quotations} color="blue" />
          <StatCard title="المقارنات الفنية" {...stats.comparisons} color="amber" />
          <StatCard title="ترشيح الموردين" {...stats.nominations} color="green" />
          <StatCard title="أوامر الشراء" {...stats.orders} color="primary" />
          <StatCard title="فحص الجودة" {...stats.inspections} color="amber" />
          <StatCard title="استلام البضائع" {...stats.receivings} color="green" />
          <StatCard title="فواتير الشراء" {...stats.invoices} color="blue" />
        </div>

        <TrackingClient initialCycles={initialCycles} allowedHrefs={allowedHrefs} />
      </PageContainer>
    </>
  );
}
