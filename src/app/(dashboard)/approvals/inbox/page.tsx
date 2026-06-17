import { getInbox } from '@/actions/common';
import { ApprovalInboxClient } from '@/components/pages/ApprovalInboxClient';

export default async function ApprovalInboxPage() {
  const { inbox, isAdmin } = await getInbox();
  return (
    <ApprovalInboxClient
      initialData={JSON.parse(JSON.stringify(inbox))}
      isAdmin={isAdmin}
    />
  );
}
