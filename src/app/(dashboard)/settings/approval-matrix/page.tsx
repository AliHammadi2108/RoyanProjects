import { getApprovalMatrices } from '@/actions/common';
import { ApprovalMatrixClient } from '@/components/pages/ApprovalMatrixClient';

export default async function ApprovalMatrixPage() {
  const matrices = await getApprovalMatrices();
  return <ApprovalMatrixClient initialData={JSON.parse(JSON.stringify(matrices))} />;
}
