import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SupplierBalancesReportClient } from '@/components/reports/SupplierBalancesReportClient';
import {
  fetchSupplierBalancesReport,
  fetchReportFilterOptions,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser, hasPermission } from '@/lib/permissions';

export default async function SupplierBalancesReportPage() {
  const user = await getCurrentUser();
  const [data, filterOptions, canExport, canPrint, canCharts, viewBalance] = await Promise.all([
    fetchSupplierBalancesReport({}),
    fetchReportFilterOptions(),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
    user ? hasPermission(user.id, 'reports.view_supplier_balance') : false,
  ]);

  return (
    <>
      <Header title="تقارير مديونية الموردين" subtitle="ملخص أرصدة ومستحقات الموردين" />
      <PageContainer>
        <SupplierBalancesReportClient
          initialData={JSON.parse(JSON.stringify(data))}
          suppliers={filterOptions.suppliers}
          permissions={{ export: canExport, print: canPrint, charts: canCharts, viewBalance }}
        />
      </PageContainer>
    </>
  );
}
