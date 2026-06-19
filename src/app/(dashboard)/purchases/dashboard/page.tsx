import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { PurchaseDashboardClient } from '@/components/pages/PurchaseDashboardClient';
import { fetchPurchaseDashboard } from '@/actions/purchase-dashboard';
import { getCurrentUser } from '@/lib/permissions';
import { getAccessibleHrefs } from '@/lib/screen-access';
import { serializeForClient } from '@/lib/serialize-client';

export default async function PurchaseDashboardPage() {
  const user = await getCurrentUser();
  const [data, allowedHrefs] = await Promise.all([
    fetchPurchaseDashboard(),
    user ? getAccessibleHrefs(user.id) : Promise.resolve([]),
  ]);

  const purchaseRoutes = allowedHrefs.filter((h) => h.startsWith('/purchases/'));

  return (
    <>
      <Header
        title="لوحة متابعة المشتريات"
        subtitle="عمليات الشراء المفتوحة — رسوم بيانية وأرقام حية"
      />
      <PageContainer>
        <PurchaseDashboardClient
          data={serializeForClient(data)}
          allowedRoutes={purchaseRoutes}
        />
      </PageContainer>
    </>
  );
}
