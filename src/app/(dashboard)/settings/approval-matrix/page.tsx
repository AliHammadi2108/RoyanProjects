import { getApprovalMatrices } from '@/actions/common';
import { fetchBaseCurrency } from '@/actions/reports';
import { ApprovalMatrixClient } from '@/components/pages/ApprovalMatrixClient';
import { serializeForClient } from '@/lib/serialize-client';

export default async function ApprovalMatrixPage() {
  const [matrices, baseCurrency] = await Promise.all([
    getApprovalMatrices(),
    fetchBaseCurrency(),
  ]);
  return (
    <ApprovalMatrixClient
      initialData={JSON.parse(JSON.stringify(matrices))}
      baseCurrency={serializeForClient(baseCurrency)}
    />
  );
}
