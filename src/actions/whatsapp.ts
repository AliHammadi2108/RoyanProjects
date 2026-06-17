'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { sendWhatsAppText, type SendWhatsAppTextResult } from '@/services/whatsapp.service';
import { isWhatsAppCloudApiConfigured } from '@/lib/whatsapp';

export async function getWhatsAppApiStatus(): Promise<{
  configured: boolean;
  autoNotify: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { configured: false, autoNotify: false };
  }

  const canSend =
    (await hasPermission(session.user.id, 'whatsapp.send')) ||
    (await hasPermission(session.user.id, 'operations.print'));

  if (!canSend) {
    return { configured: false, autoNotify: false };
  }

  const configured = isWhatsAppCloudApiConfigured();
  const autoFlag = process.env.WHATSAPP_AUTO_NOTIFY?.trim().toLowerCase();
  const autoNotify =
    configured && autoFlag !== 'false' && autoFlag !== '0' && autoFlag !== 'no';

  return { configured, autoNotify };
}

export async function sendWhatsAppMessageAction(
  phone: string,
  message: string
): Promise<SendWhatsAppTextResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'غير مصرح' };
  }

  const canSend =
    (await hasPermission(session.user.id, 'whatsapp.send')) ||
    (await hasPermission(session.user.id, 'operations.print')) ||
    (await hasPermission(session.user.id, 'reports.export'));

  if (!canSend) {
    return { success: false, error: 'ليس لديك صلاحية إرسال واتساب' };
  }

  if (!isWhatsAppCloudApiConfigured()) {
    return { success: false, error: 'إرسال واتساب التلقائي غير مُفعّل — استخدم الإرسال اليدوي' };
  }

  if (!message.trim()) {
    return { success: false, error: 'الرسالة فارغة' };
  }

  return sendWhatsAppText({ toPhone: phone, message: message.trim() });
}
