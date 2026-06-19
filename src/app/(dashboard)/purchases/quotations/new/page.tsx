import { getMasterData } from '@/actions/common';
import { getApprovedPurchaseRequests } from '@/actions/purchase-requests';
import { QuotationForm } from '@/components/pages/QuotationForm';
import { serializeForClient } from '@/lib/serialize-client';

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: { requestId?: string };
}) {
  const [masterData, approvedRequests] = await Promise.all([
    getMasterData(),
    getApprovedPurchaseRequests(),
  ]);

  return (
    <QuotationForm
      masterData={masterData}
      approvedRequests={serializeForClient(approvedRequests)}
      isNew
      defaultRequestId={searchParams.requestId}
    />
  );
}
