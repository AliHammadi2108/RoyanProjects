'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { updateEnvFileVariable } from '@/lib/env-file';
import { sendWhatsAppText, type SendWhatsAppTextResult } from '@/services/whatsapp.service';
import {
  getWhatsAppEnvDefaultRecipient,
  isWhatsAppApiConfigured,
  isWhatsAppAutoNotifyEnabled,
  getDefaultCountryCode,
  resolveDefaultWhatsAppPhone,
} from '@/lib/whatsapp';

export interface WhatsAppSettingsStatus {
  configured: boolean;
  autoNotify: boolean;
  defaultCountryCode: string;
  phoneNumberIdMasked: string | null;
  tokenConfigured: boolean;
  restartRequired: boolean;
}

async function requireConfigurePermission(userId: string): Promise<boolean> {
  return (
    (await hasPermission(userId, 'whatsapp.configure')) ||
    (await hasPermission(userId, 'access.roles.view'))
  );
}

export async function getWhatsAppSettingsStatus(): Promise<WhatsAppSettingsStatus | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const allowed = await requireConfigurePermission(session.user.id);
  if (!allowed) return null;

  const configured = isWhatsAppApiConfigured();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const tokenConfigured = Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN?.trim());

  return {
    configured,
    autoNotify: isWhatsAppAutoNotifyEnabled(),
    defaultCountryCode: getDefaultCountryCode(),
    phoneNumberIdMasked: phoneNumberId
      ? phoneNumberId.length <= 4
        ? '****'
        : `${'*'.repeat(Math.max(0, phoneNumberId.length - 4))}${phoneNumberId.slice(-4)}`
      : null,
    tokenConfigured,
    restartRequired: false,
  };
}

/** @deprecated use getWhatsAppSettingsStatus */
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
    (await hasPermission(session.user.id, 'operations.print')) ||
    (await hasPermission(session.user.id, 'whatsapp.configure'));

  if (!canSend) {
    return { configured: false, autoNotify: false };
  }

  return {
    configured: isWhatsAppApiConfigured(),
    autoNotify: isWhatsAppAutoNotifyEnabled(),
  };
}

export async function getWhatsAppDefaultPhone(partyPhone?: string | null): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return resolveDefaultWhatsAppPhone(
    partyPhone,
    session.user.phone,
    getWhatsAppEnvDefaultRecipient()
  );
}

export async function setWhatsAppAutoNotifyAction(
  enabled: boolean
): Promise<{ success: boolean; error?: string; restartRequired?: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'غير مصرح' };
  }

  if (!(await requireConfigurePermission(session.user.id))) {
    return { success: false, error: 'ليس لديك صلاحية إعداد واتساب' };
  }

  if (!isWhatsAppApiConfigured()) {
    return {
      success: false,
      error: 'يجب إعداد WHATSAPP_CLOUD_API_TOKEN و WHATSAPP_PHONE_NUMBER_ID في ملف .env أولاً',
    };
  }

  try {
    await updateEnvFileVariable('WHATSAPP_AUTO_NOTIFY', enabled ? 'true' : 'false');
    return { success: true, restartRequired: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'فشل تحديث الإعداد',
    };
  }
}

export async function testWhatsAppConnectionAction(): Promise<SendWhatsAppTextResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: 'غير مصرح' };
  }

  if (!(await requireConfigurePermission(session.user.id))) {
    return { success: false, error: 'ليس لديك صلاحية إعداد واتساب' };
  }

  if (!isWhatsAppApiConfigured()) {
    return {
      success: false,
      error: 'WhatsApp Cloud API غير مُعدّ — أضف المفاتيح في ملف .env',
    };
  }

  const userPhone = session.user.phone?.trim();
  if (!userPhone) {
    return {
      success: false,
      error: 'لا يوجد رقم هاتف في ملفك الشخصي — أضف رقماً بصيغة +967... من إدارة المستخدمين',
    };
  }

  const message = [
    '✅ *اختبار اتصال واتساب*',
    '',
    'تم الإرسال بنجاح من نظام المشتريات.',
    `التاريخ: ${new Date().toLocaleString('ar-YE')}`,
    '',
    '_إذا وصلتك هذه الرسالة فالإعداد صحيح._',
  ].join('\n');

  return sendWhatsAppText({ toPhone: userPhone, message });
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
    (await hasPermission(session.user.id, 'reports.export')) ||
    (await hasPermission(session.user.id, 'whatsapp.auto'));

  if (!canSend) {
    return { success: false, error: 'ليس لديك صلاحية إرسال واتساب' };
  }

  if (!isWhatsAppApiConfigured()) {
    return { success: false, error: 'إرسال واتساب التلقائي غير مُفعّل — استخدم الإرسال اليدوي' };
  }

  if (!message.trim()) {
    return { success: false, error: 'الرسالة فارغة' };
  }

  return sendWhatsAppText({ toPhone: phone, message: message.trim() });
}
