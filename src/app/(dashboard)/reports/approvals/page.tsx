import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ApprovalsReportClient } from '@/components/reports/ApprovalsReportClient';
import {
  fetchApprovalsReport,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';

export default async function ApprovalsReportPage() {
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
        />
      </PageContainer>
    </>
  );
}
