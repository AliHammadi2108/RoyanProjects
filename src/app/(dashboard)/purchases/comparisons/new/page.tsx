import { getMasterData } from '@/actions/common';
import { getApprovedPurchaseRequests } from '@/actions/purchase-requests';
import { ComparisonForm } from '@/components/pages/ComparisonForm';

export default async function NewComparisonPage({
  searchParams,
}: {
  searchParams: { requestId?: string; quotationId?: string; quotationIds?: string };
}) {
  const [masterData, approvedRequests] = await Promise.all([
    getMasterData(),
    getApprovedPurchaseRequests(),
  ]);

  const defaultQuotationIds = [
    ...(searchParams.quotationId ? [searchParams.quotationId] : []),
    ...(searchParams.quotationIds
      ? searchParams.quotationIds.split(',').filter(Boolean)
      : []),
  ];

  return (
    <ComparisonForm
      masterData={masterData}
      approvedRequests={JSON.parse(JSON.stringify(approvedRequests))}
      isNew
      defaultRequestId={searchParams.requestId}
      defaultQuotationIds={defaultQuotationIds}
    />
  );
}
