import { getInbox } from '@/actions/common';
import { ApprovalInboxClient } from '@/components/pages/ApprovalInboxClient';
import { serializeForClient } from '@/lib/serialize-client';

export default async function ApprovalInboxPage() {
  const { inbox, isAdmin } = await getInbox();
  return (
    <ApprovalInboxClient
      initialData={serializeForClient(inbox)}
      isAdmin={isAdmin}
    />
  );
}
