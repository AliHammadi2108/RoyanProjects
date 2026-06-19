import { getMasterData } from '@/actions/common';
import { getReceivingsForInvoice } from '@/actions/purchase-orders';
import { InvoiceForm } from '@/components/pages/InvoiceForm';
import { serializeForClient } from '@/lib/serialize-client';

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
      receivings={serializeForClient(receivings)}
      isNew
      defaultOrderId={searchParams.orderId}
      defaultReceivingId={searchParams.receivingId}
    />
  );
}
