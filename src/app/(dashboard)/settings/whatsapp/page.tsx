import { redirect } from 'next/navigation';
import { requireScreenAccess } from '@/lib/permissions';
import { getWhatsAppSettingsStatus } from '@/actions/whatsapp';
import { WhatsAppSettingsClient } from '@/components/pages/WhatsAppSettingsClient';

export default async function WhatsAppSettingsPage() {
  await requireScreenAccess('/settings/whatsapp');
  const status = await getWhatsAppSettingsStatus();
  if (!status) redirect('/unauthorized');

  return <WhatsAppSettingsClient initial={status} />;
}
