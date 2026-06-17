import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';
import { OPERATION_CONFIG, type OperationType } from '@/lib/operation-toolbar';

/** Strip non-digits; keep leading + if present for display. */
export function stripPhoneDigits(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Normalize to E.164-ish digits for wa.me (no + prefix in URL path).
 * Defaults Saudi (+966) when local number starts with 0 or 9-digit mobile.
 */
export function normalizePhoneToE164(phone: string, defaultCountryCode = '966'): string | null {
  const raw = stripPhoneDigits(phone);
  if (!raw) return null;

  let digits = raw.replace(/^\+/, '');
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith(defaultCountryCode) && digits.length >= 11) {
    return digits;
  }

  if (digits.startsWith('0')) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (digits.length === 9 && /^5/.test(digits)) {
    digits = defaultCountryCode + digits;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function buildWhatsAppUrl(message: string, phone?: string | null): string {
  const encoded = encodeURIComponent(message);
  const e164 = phone ? normalizePhoneToE164(phone) : null;
  if (e164) {
    return `https://wa.me/${e164}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export function buildAbsoluteUrl(path: string): string {
  const base = getAppBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function getDocumentViewPath(operationType: OperationType, documentId: string): string {
  const config = OPERATION_CONFIG[operationType];
  const base = config.listHref;
  return `${base}/${documentId}`;
}

export function getDocumentPrintPath(operationType: OperationType, documentId: string): string {
  const config = OPERATION_CONFIG[operationType];
  return `/purchases/print/${config.printDocType}/${documentId}`;
}

export function getDocumentTypeLabelAr(operationType: OperationType): string {
  const docTypeKey = Object.entries(OPERATION_CONFIG).find(([k]) => k === operationType)?.[0];
  if (!docTypeKey) return 'وثيقة';
  const prismaTypeMap: Record<OperationType, string> = {
    purchase_request: 'PURCHASE_REQUEST',
    quotation: 'QUOTATION',
    comparison: 'TECHNICAL_COMPARISON',
    nomination: 'SUPPLIER_NOMINATION',
    purchase_order: 'PURCHASE_ORDER',
    inspection: 'INSPECTION',
    receiving: 'RECEIVING',
    invoice: 'INVOICE',
    supplier_payment: 'SUPPLIER_PAYMENT',
  };
  return DOCUMENT_LABELS_AR[prismaTypeMap[operationType]] || configFallback(operationType);
}

function configFallback(operationType: OperationType): string {
  const titles: Record<OperationType, string> = {
    purchase_request: 'طلب شراء',
    quotation: 'عرض سعر',
    comparison: 'مقارنة فنية',
    nomination: 'ترشيح مورد',
    purchase_order: 'أمر شراء',
    inspection: 'فحص',
    receiving: 'إذن توريد',
    invoice: 'فاتورة مشتريات',
    supplier_payment: 'سند صرف مورد',
  };
  return titles[operationType];
}

export interface DocumentWhatsAppInput {
  docTypeLabel: string;
  documentNo: string;
  documentDate?: string;
  status?: string;
  total?: string;
  partyName?: string;
  documentUrl?: string;
  printUrl?: string;
  extraLines?: string[];
}

export function formatDocumentMessage(input: DocumentWhatsAppInput): string {
  const lines: string[] = [
    '📄 *تقرير وثيقة — نظام المشتريات*',
    '',
    `*نوع الوثيقة:* ${input.docTypeLabel}`,
    `*الرقم:* ${input.documentNo}`,
  ];

  if (input.documentDate) lines.push(`*التاريخ:* ${input.documentDate}`);
  if (input.status) lines.push(`*الحالة:* ${input.status}`);
  if (input.partyName) lines.push(`*الطرف:* ${input.partyName}`);
  if (input.total) lines.push(`*المبلغ:* ${input.total}`);

  if (input.extraLines?.length) {
    lines.push('');
    lines.push(...input.extraLines);
  }

  if (input.documentUrl) {
    lines.push('');
    lines.push(`*رابط النظام:* ${input.documentUrl}`);
  }
  if (input.printUrl && input.printUrl !== input.documentUrl) {
    lines.push(`*رابط الطباعة:* ${input.printUrl}`);
  }

  lines.push('');
  lines.push('_تم الإرسال من نظام المشتريات_');
  return lines.join('\n');
}

export interface NotificationWhatsAppInput {
  title: string;
  message: string;
  link?: string;
  createdAt?: string;
}

export function formatNotificationMessage(input: NotificationWhatsAppInput): string {
  const lines: string[] = [
    '🔔 *تنبيه — نظام المشتريات*',
    '',
    `*${input.title}*`,
    '',
    input.message,
  ];

  if (input.createdAt) lines.push('', `*التاريخ:* ${input.createdAt}`);
  if (input.link) {
    lines.push('');
    lines.push(`*رابط:* ${input.link}`);
  }

  lines.push('');
  lines.push('_تنبيه آلي من نظام المشتريات_');
  return lines.join('\n');
}

export interface ReportWhatsAppInput {
  reportTitle: string;
  subtitle?: string;
  summaryLines?: string[];
  rowCount?: number;
  attachNote?: string;
}

export function formatReportMessage(input: ReportWhatsAppInput): string {
  const lines: string[] = [
    '📊 *تقرير — نظام المشتريات*',
    '',
    `*${input.reportTitle}*`,
  ];

  if (input.subtitle) lines.push(input.subtitle);
  if (input.summaryLines?.length) {
    lines.push('');
    lines.push(...input.summaryLines.map((l) => `• ${l}`));
  }
  if (input.rowCount != null) {
    lines.push('', `*عدد السجلات:* ${input.rowCount}`);
  }
  if (input.attachNote) {
    lines.push('');
    lines.push(`_${input.attachNote}_`);
  }

  lines.push('');
  lines.push('_تم الإرسال من نظام المشتريات_');
  return lines.join('\n');
}

export function isWhatsAppCloudApiConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export function isWhatsAppAutoNotifyEnabled(): boolean {
  if (!isWhatsAppCloudApiConfigured()) return false;
  const flag = process.env.WHATSAPP_AUTO_NOTIFY?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  return true;
}

export function documentRouteFromType(documentType?: string): string | undefined {
  if (!documentType) return undefined;
  return DOCUMENT_ROUTES[documentType];
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback below */
    }
  }
  return false;
}

export function supplierPhoneFromMaster(
  suppliers: Array<{ id: string; phone?: string | null }>,
  supplierId?: string | null
): string | null {
  if (!supplierId) return null;
  return suppliers.find((s) => s.id === supplierId)?.phone ?? null;
}

export function openWhatsAppUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
