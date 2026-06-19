import { getQuotation } from '@/actions/quotations';
import { getMasterData } from '@/actions/common';
import { QuotationForm } from '@/components/pages/QuotationForm';
import { notFound } from 'next/navigation';
import { serializeForClient } from '@/lib/serialize-client';

export default async function QuotationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [quotation, masterData] = await Promise.all([
    getQuotation(params.id),
    getMasterData(),
  ]);

  if (!quotation) notFound();

  return (
    <QuotationForm
      masterData={masterData}
      approvedRequests={[]}
      existing={serializeForClient(quotation)}
    />
  );
}
