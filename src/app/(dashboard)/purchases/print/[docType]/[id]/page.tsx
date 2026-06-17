import { notFound } from 'next/navigation';
import { OperationPrintView } from '@/components/pages/OperationPrintView';
import { OPERATION_CONFIG, type OperationType } from '@/lib/operation-toolbar';
import { getPrintDocument } from '@/services/print-document.service';

const DOC_TYPE_ALIASES: Record<string, OperationType> = {
  purchase_request: 'purchase_request',
  quotation: 'quotation',
  comparison: 'comparison',
  nomination: 'nomination',
  purchase_order: 'purchase_order',
  inspection: 'inspection',
  receiving: 'receiving',
  invoice: 'invoice',
  supplier_payment: 'supplier_payment',
};

export default async function OperationPrintPage({
  params,
}: {
  params: { docType: string; id: string };
}) {
  const operationType = DOC_TYPE_ALIASES[params.docType];
  if (!operationType) notFound();

  const config = OPERATION_CONFIG[operationType];
  const data = await getPrintDocument(operationType, params.id);
  if (!data) notFound();

  return (
    <OperationPrintView
      data={data}
      listHref={config.listHref}
      listLabel={config.listLabel}
    />
  );
}
