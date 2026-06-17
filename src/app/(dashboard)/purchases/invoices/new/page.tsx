import { getMasterData } from '@/actions/common';
import { getReceivingsForInvoice } from '@/actions/purchase-orders';
import { InvoiceForm } from '@/components/pages/InvoiceForm';

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { orderId?: string; receivingId?: string };
}) {
  const [masterData, receivings] = await Promise.all([
    getMasterData(),
    getReceivingsForInvoice(),
  ]);

  return (
    <InvoiceForm
      masterData={masterData}
      receivings={JSON.parse(JSON.stringify(receivings))}
      isNew
      defaultOrderId={searchParams.orderId}
      defaultReceivingId={searchParams.receivingId}
    />
  );
}
