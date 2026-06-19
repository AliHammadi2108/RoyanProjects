import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ApprovalsReportClient } from '@/components/reports/ApprovalsReportClient';
import {
  fetchApprovalsReport,
  fetchBaseCurrency,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser } from '@/lib/permissions';
import { serializeForClient } from '@/lib/serialize-client';

export default async function ApprovalsReportPage() {
  const user = await getCurrentUser();
  const [data, canExport, canPrint, canCharts, baseCurrency] = await Promise.all([
    fetchApprovalsReport({}),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
    fetchBaseCurrency(),
  ]);

  return (
    <>
      <Header title="تقارير الاعتمادات" subtitle="سجل طلبات الاعتماد والحالات" />
      <PageContainer>
        <ApprovalsReportClient
          initialData={serializeForClient(data)}
          baseCurrency={serializeForClient(baseCurrency)}
          permissions={{ export: canExport, print: canPrint, charts: canCharts }}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
