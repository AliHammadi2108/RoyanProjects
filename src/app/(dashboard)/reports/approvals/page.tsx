import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ApprovalsReportClient } from '@/components/reports/ApprovalsReportClient';
import {
  fetchApprovalsReport,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser } from '@/lib/permissions';

export default async function ApprovalsReportPage() {
  const user = await getCurrentUser();
  const [data, canExport, canPrint, canCharts] = await Promise.all([
    fetchApprovalsReport({}),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
  ]);

  return (
    <>
      <Header title="تقارير الاعتمادات" subtitle="سجل طلبات الاعتماد والحالات" />
      <PageContainer>
        <ApprovalsReportClient
          initialData={JSON.parse(JSON.stringify(data))}
          permissions={{ export: canExport, print: canPrint, charts: canCharts }}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
