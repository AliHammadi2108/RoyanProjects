import { notFound } from 'next/navigation';
import { OperationPrintView } from '@/components/pages/OperationPrintView';
import { OPERATION_CONFIG } from '@/lib/operation-toolbar';
import { getPrintDocument } from '@/services/print-document.service';

export default async function SupplierPaymentPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const config = OPERATION_CONFIG.supplier_payment;
  const data = await getPrintDocument('supplier_payment', params.id);
  if (!data) notFound();

  return (
    <OperationPrintView
      data={data}
      listHref={config.listHref}
      listLabel={config.listLabel}
    />
  );
}
