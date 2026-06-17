import { getPendingApprovalRequests } from '@/actions/access-control';
import { ApprovalRequestsClient } from '@/components/pages/ApprovalRequestsClient';

export default async function ApprovalRequestsPage() {
  const data = await getPendingApprovalRequests();
  return <ApprovalRequestsClient initialData={JSON.parse(JSON.stringify(data))} />;
}
