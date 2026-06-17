import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { QuantityCostReportClient } from '@/components/reports/QuantityCostReportClient';
import {
  fetchQuantityCostReport,
  fetchReportFilterOptions,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser, hasPermission } from '@/lib/permissions';

export default async function QuantityCostReportPage() {
  const user = await getCurrentUser();
  const [data, filterOptions, canExport, canPrint, canCharts, viewCost] = await Promise.all([
    fetchQuantityCostReport({}),
    fetchReportFilterOptions(),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
    user ? hasPermission(user.id, 'reports.view_cost') : false,
  ]);

  return (
    <>
      <Header title="تقارير مقارنة الكميات والتكاليف" subtitle="مقارنة الكميات والتكاليف عبر مراحل الشراء" />
      <PageContainer>
        <QuantityCostReportClient
          initialData={JSON.parse(JSON.stringify(data))}
          filterOptions={filterOptions}
          permissions={{ export: canExport, print: canPrint, charts: canCharts, viewCost }}
        />
      </PageContainer>
    </>
  );
}
