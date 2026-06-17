import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SupplierStatementReportClient } from '@/components/reports/SupplierStatementReportClient';
import {
  fetchSuppliersForStatement,
  canExportReports,
  canPrintReports,
  canViewSupplierStatementBalance,
} from '@/actions/reports';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/permissions';

export default async function SupplierStatementReportPage() {
  const user = await getCurrentUser();
  const [suppliers, canExport, canPrint, viewBalance] = await Promise.all([
    fetchSuppliersForStatement(),
    canExportReports(),
    canPrintReports(),
    canViewSupplierStatementBalance(),
  ]);

  const currencies = await prisma.currency.findMany({
    where: { isActive: true },
    select: { id: true, code: true, nameAr: true },
    orderBy: { code: 'asc' },
  });

  return (
    <>
      <Header title="كشف حساب المورد" subtitle="كشف تفصيلي بحركات المشتريات والمدفوعات" />
      <PageContainer>
        <SupplierStatementReportClient
          suppliers={JSON.parse(JSON.stringify(suppliers))}
          currencies={JSON.parse(JSON.stringify(currencies))}
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
