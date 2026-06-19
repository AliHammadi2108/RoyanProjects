import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SupplierBalancesReportClient } from '@/components/reports/SupplierBalancesReportClient';
import {
  fetchSupplierBalancesReport,
  fetchReportFilterOptions,
  fetchBaseCurrency,
  canExportReports,
  canPrintReports,
  canViewReportCharts,
} from '@/actions/reports';
import { getCurrentUser, hasPermission } from '@/lib/permissions';
import { serializeForClient } from '@/lib/serialize-client';

export default async function SupplierBalancesReportPage() {
  const user = await getCurrentUser();
  const [data, filterOptions, canExport, canPrint, canCharts, viewBalance, baseCurrency] = await Promise.all([
    fetchSupplierBalancesReport({}),
    fetchReportFilterOptions(),
    canExportReports(),
    canPrintReports(),
    canViewReportCharts(),
    user ? hasPermission(user.id, 'reports.view_supplier_balance') : false,
    fetchBaseCurrency(),
  ]);

  return (
    <>
      <Header title="تقارير مديونية الموردين" subtitle="ملخص أرصدة ومستحقات الموردين" />
      <PageContainer>
        <SupplierBalancesReportClient
          initialData={serializeForClient(data)}
          suppliers={filterOptions.suppliers}
          baseCurrency={serializeForClient(baseCurrency)}
          permissions={{ export: canExport, print: canPrint, charts: canCharts, viewBalance }}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
