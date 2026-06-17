import { getInvoice, getReceivingsForInvoice } from '@/actions/purchase-orders';
import { getMasterData } from '@/actions/common';
import { InvoiceForm } from '@/components/pages/InvoiceForm';
import { notFound } from 'next/navigation';

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [invoice, masterData, receivings] = await Promise.all([
    getInvoice(params.id),
    getMasterData(),
    getReceivingsForInvoice(),
  ]);

  if (!invoice) notFound();

  return (
    <InvoiceForm
      masterData={masterData}
      receivings={JSON.parse(JSON.stringify(receivings))}
      existing={JSON.parse(JSON.stringify(invoice))}
    />
  );
}
