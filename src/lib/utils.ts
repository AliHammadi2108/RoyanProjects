import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyLike = { symbol?: string | null; code?: string | null } | null | undefined;

export function getCurrencySymbol(currency?: CurrencyLike, fallback = 'ر.س'): string {
  if (currency?.symbol?.trim()) return currency.symbol.trim();
  if (currency?.code?.trim()) return currency.code.trim();
  return fallback;
}

export function formatCurrency(amount: number, symbol = 'ر.س'): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatDocumentCurrency(amount: number, currency?: CurrencyLike, fallback = 'ر.س'): string {
  return formatCurrency(amount, getCurrencySymbol(currency, fallback));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-SA');
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ar-SA');
}

export function calculateLineTotal(quantity: number, unitPrice: number, discount = 0, tax = 0): number {
  const subtotal = quantity * unitPrice;
  const afterDiscount = subtotal - discount;
  return afterDiscount + tax;
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** تحويل القيم الفارغة إلى undefined لتجنب انتهاك قيود المفاتيح الأجنبية في Prisma */
export function toOptionalId(value?: string | null): string | undefined {
  if (!value || !String(value).trim()) return undefined;
  return value;
}

export function formatActionError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes('Foreign key constraint')) {
      return 'بيانات غير صالحة: تأكد من اختيار الفرع والأصناف من القوائم، وأعد تسجيل الدخول إن استمر الخطأ';
    }
    return err.message;
  }
  return 'حدث خطأ غير متوقع';
}
