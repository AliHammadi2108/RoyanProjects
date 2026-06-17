import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ReorderAlertsReportClient } from '@/components/reports/ReorderAlertsReportClient';
import {
  fetchReorderAlertsReport,
  canExportReorderAlerts,
  canPrintReorderAlerts,
  canCreatePrFromReorderAlert,
  fetchReorderAlertFilterOptions,
} from '@/actions/reorder-alerts';
import { getCurrentUser } from '@/lib/permissions';

export default async function ReorderAlertsReportPage({
  searchParams,
}: {
  searchParams: { itemId?: string; warehouseId?: string };
}) {
  const user = await getCurrentUser();
  const [data, canExport, canPrint, canCreatePr, filterOptions] = await Promise.all([
    fetchReorderAlertsReport({
      alertStatus: 'open',
      itemId: searchParams.itemId,
      warehouseId: searchParams.warehouseId,
    }),
    canExportReorderAlerts(),
    canPrintReorderAlerts(),
    canCreatePrFromReorderAlert(),
    fetchReorderAlertFilterOptions(),
  ]);

  return (
    <>
      <Header title="تنبيهات حد الطلب" subtitle="الأصناف التي وصلت حد الطلب" />
      <PageContainer>
        <ReorderAlertsReportClient
          initialData={JSON.parse(JSON.stringify(data))}
          permissions={{ export: canExport, print: canPrint, createPr: canCreatePr }}
          filterOptions={JSON.parse(JSON.stringify(filterOptions))}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
