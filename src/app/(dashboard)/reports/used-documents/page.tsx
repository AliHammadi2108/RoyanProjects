import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { UsedDocumentsReportClient } from '@/components/reports/UsedDocumentsReportClient';
import {
  fetchUsedDocumentsReport,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser } from '@/lib/permissions';
import { serializeForClient } from '@/lib/serialize-client';

export default async function UsedDocumentsReportPage() {
  const user = await getCurrentUser();
  const [data, canExport, canPrint, canCharts] = await Promise.all([
    fetchUsedDocumentsReport({ usageType: 'all' }),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
  ]);

  return (
    <>
      <Header title="تقارير الوثائق المستخدمة والمقفلة" subtitle="وثائق محوّلة أو مقفلة للتعديل" />
      <PageContainer>
        <UsedDocumentsReportClient
          initialData={serializeForClient(data)}
          permissions={{ export: canExport, print: canPrint, charts: canCharts }}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
