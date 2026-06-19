import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SupplierStatementReportClient } from '@/components/reports/SupplierStatementReportClient';
import {
  fetchSuppliersForStatement,
  fetchBaseCurrency,
  canExportReports,
  canPrintReports,
  canViewSupplierStatementBalance,
} from '@/actions/reports';
import { getCurrentUser } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { serializeForClient } from '@/lib/serialize-client';

export default async function SupplierStatementReportPage() {
  const user = await getCurrentUser();
  const [suppliers, canExport, canPrint, viewBalance, baseCurrency] = await Promise.all([
    fetchSuppliersForStatement(),
    canExportReports(),
    canPrintReports(),
    canViewSupplierStatementBalance(),
    fetchBaseCurrency(),
  ]);

  const currencies = await prisma.currency.findMany({
    where: { isActive: true },
    select: { id: true, code: true, nameAr: true, symbol: true },
    orderBy: { code: 'asc' },
  });

  return (
    <>
      <Header title="كشف حساب المورد" subtitle="كشف تفصيلي بحركات المشتريات والمدفوعات" />
      <PageContainer>
        <SupplierStatementReportClient
          suppliers={serializeForClient(suppliers)}
          currencies={serializeForClient(currencies)}
          baseCurrency={serializeForClient(baseCurrency)}
          permissions={{
            export: canExport,
            print: canPrint,
            viewBalance,
          }}
          printedBy={user?.nameAr || user?.username}
        />
      </PageContainer>
    </>
  );
}
