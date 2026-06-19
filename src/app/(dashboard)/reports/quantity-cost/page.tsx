import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { QuantityCostReportClient } from '@/components/reports/QuantityCostReportClient';
import {
  fetchQuantityCostReport,
  fetchReportFilterOptions,
  fetchBaseCurrency,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser, hasPermission } from '@/lib/permissions';
import { serializeForClient } from '@/lib/serialize-client';

export default async function QuantityCostReportPage() {
  const user = await getCurrentUser();
  const [data, filterOptions, canExport, canPrint, canCharts, viewCost, baseCurrency] = await Promise.all([
    fetchQuantityCostReport({}),
    fetchReportFilterOptions(),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
    user ? hasPermission(user.id, 'reports.view_cost') : false,
    fetchBaseCurrency(),
  ]);

  return (
    <>
      <Header title="تقارير مقارنة الكميات والتكاليف" subtitle="مقارنة الكميات والتكاليف عبر مراحل الشراء" />
      <PageContainer>
        <QuantityCostReportClient
          initialData={serializeForClient(data)}
          filterOptions={filterOptions}
          baseCurrency={serializeForClient(baseCurrency)}
          permissions={{ export: canExport, print: canPrint, charts: canCharts, viewCost }}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
