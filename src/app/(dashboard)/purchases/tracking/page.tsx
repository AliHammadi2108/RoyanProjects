import { Header } from '@/components/layout/Header';
import { PageContainer, StatCard } from '@/components/layout/PageContainer';
import { TrackingClient } from '@/components/pages/TrackingClient';
import { fetchTrackingStats, fetchTrackingList } from '@/actions/common';
import { getCurrentUser } from '@/lib/permissions';
import { getAccessibleHrefs } from '@/lib/screen-access';

export default async function TrackingPage() {
  const user = await getCurrentUser();
  const [stats, cycles, allowedHrefs] = await Promise.all([
    fetchTrackingStats(),
    fetchTrackingList(),
    user ? getAccessibleHrefs(user.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <Header
        title="متابعة عمليات الشراء"
        subtitle="لوحة متابعة موحدة لدورة المشتريات"
      />
      <PageContainer>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="طلبات الشراء" {...stats.purchaseRequests} color="primary" />
          <StatCard title="عروض الأسعار" {...stats.quotations} color="blue" />
          <StatCard title="المقارنة الفنية" {...stats.comparisons} color="amber" />
          <StatCard title="اختيار المورد" {...stats.nominations} color="green" />
          <StatCard title="أوامر الشراء" {...stats.orders} color="primary" />
          <StatCard title="فحص المشتريات" {...stats.inspections} color="amber" />
          <StatCard title="إذن التوريد" {...stats.receivings} color="green" />
          <StatCard title="فاتورة الشراء" {...stats.invoices} color="blue" />
        </div>

        <TrackingClient
          initialCycles={JSON.parse(JSON.stringify(cycles))}
          allowedHrefs={allowedHrefs}
        />
      </PageContainer>
    </>
  );
}
