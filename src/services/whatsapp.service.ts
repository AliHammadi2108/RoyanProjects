import { prisma } from '@/lib/db';
import {
  formatNotificationMessage,
  getWhatsAppConfigIssues,
  isWhatsAppAutoNotifyEnabled,
  looksLikePhoneNumberInsteadOfMetaPhoneNumberId,
  isWhatsAppCloudApiConfigured,
  normalizePhoneToE164,
} from '@/lib/whatsapp';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

export interface SendWhatsAppTextInput {
  toPhone: string;
  message: string;
}

export interface SendWhatsAppTextResult {
  success: boolean;
  messageId?: string;
  error?: string;
}


function formatMetaGraphApiError(error?: {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}): string {
  if (!error) return "";
  const parts: string[] = [];
  if (error.message) parts.push(error.message);
  if (error.code != null) parts.push(`code=${error.code}`);
  if (error.error_subcode != null) parts.push(`subcode=${error.error_subcode}`);
  if (error.type) parts.push(`type=${error.type}`);
  if (error.fbtrace_id) parts.push(`trace=${error.fbtrace_id}`);
  return parts.join(" | ");
}

export async function verifyWhatsAppCloudApiCredentials(): Promise<{
  ok: boolean;
  error?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
}> {
  const configIssues = getWhatsAppConfigIssues();
  if (configIssues.length) {
    return { ok: false, error: configIssues.join(" ") };
  }

  const token = process.env.WHATSAPP_CLOUD_API_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();

  if (looksLikePhoneNumberInsteadOfMetaPhoneNumberId(phoneNumberId)) {
    return {
      ok: false,
      error:
        "معرّف WHATSAPP_PHONE_NUMBER_ID غير صحيح: استخدم Phone number ID من Meta وليس رقم الواتساب.",
    };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
      };
    };

    if (response.ok && payload.display_phone_number) {
      return {
        ok: true,
        displayPhoneNumber: payload.display_phone_number,
        verifiedName: payload.verified_name,
      };
    }

    const formatted = formatMetaGraphApiError(payload.error);
    if (response.status === 401 || payload.error?.code === 190) {
      return {
        ok: false,
        error:
          formatted ||
          "توكن WhatsApp غير صالح أو منتهي — أنشئ System User Token دائمًا من Meta.",
      };
    }
    return { ok: false, error: formatted || `HTTP ${response.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "تعذر الاتصال بـ graph.facebook.com",
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWhatsAppText(
  input: SendWhatsAppTextInput
): Promise<SendWhatsAppTextResult> {
  if (!isWhatsAppCloudApiConfigured()) {
    return { success: false, error: 'WhatsApp Cloud API غير مُعدّ' };
  }

  const token = process.env.WHATSAPP_CLOUD_API_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const to = normalizePhoneToE164(input.toPhone);

  if (!to) {
    return { success: false, error: 'رقم الهاتف غير صالح' };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: true, body: input.message },
        }),
      });

      const payload = (await response.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
      };

      if (response.ok && payload.messages?.[0]?.id) {
        return { success: true, messageId: payload.messages[0].id };
      }

      lastError = formatMetaGraphApiError(payload.error) || `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'فشل الإرسال';
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return { success: false, error: lastError || 'فشل الإرسال بعد عدة محاولات' };
}

export interface QueueNotificationWhatsAppInput {
  userId: string;
  title: string;
  message: string;
  link?: string;
}

/** Fire-and-forget WhatsApp for system notifications when API + user phone exist. */
export async function queueNotificationWhatsApp(input: QueueNotificationWhatsAppInput): Promise<void> {
  if (!isWhatsAppAutoNotifyEnabled()) return;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { phone: true, isActive: true },
  });

  if (!user?.isActive || !user.phone?.trim()) return;

  const body = formatNotificationMessage({
    title: input.title,
    message: input.message,
    link: input.link,
  });

  void sendWhatsAppText({ toPhone: user.phone, message: body })
    .then((result) => {
      if (result.success) {
        console.info('[whatsapp] auto notification sent:', result.messageId);
      } else {
        console.error('[whatsapp] auto notification failed:', result.error);
      }
    })
    .catch((err) => {
      console.error('[whatsapp] auto notification error:', err);
    });
}
