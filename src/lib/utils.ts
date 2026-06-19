import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyLike = { symbol?: string | null; code?: string | null } | null | undefined;

export type CurrencyRecord = CurrencyLike & { id?: string; isBase?: boolean };

/** Arabic locale with Western (Latin) numerals — keeps RTL-friendly formatting without Arabic-Indic digits */
export const ARABIC_LOCALE_LATIN = 'ar-SA-u-nu-latn';

export const DEFAULT_CURRENCY_SYMBOL = 'ر.س';

export function getCurrencySymbol(currency?: CurrencyLike, fallback = DEFAULT_CURRENCY_SYMBOL): string {
  if (currency?.symbol?.trim()) return currency.symbol.trim();
  if (currency?.code?.trim()) return currency.code.trim();
  return fallback;
}

export function getBaseCurrency(currencies?: CurrencyRecord[] | null): CurrencyRecord | undefined {
  if (!currencies?.length) return undefined;
  return currencies.find((c) => c.isBase);
}

export function getBaseCurrencySymbol(currencies?: CurrencyRecord[] | null): string {
  return getCurrencySymbol(getBaseCurrency(currencies), DEFAULT_CURRENCY_SYMBOL);
}

export function resolveCurrencyById(
  currencies: CurrencyRecord[] | undefined | null,
  currencyId?: string | null
): CurrencyRecord | undefined {
  if (!currencyId || !currencies?.length) return undefined;
  return currencies.find((c) => c.id === currencyId);
}

/** Resolve document currency: stored relation → currencyId lookup → linked document. */
export function getDocumentCurrency(options: {
  currencyId?: string | null;
  currencies?: CurrencyRecord[];
  existing?: CurrencyLike;
  linked?: CurrencyLike;
}): CurrencyLike | undefined {
  if (options.existing?.symbol?.trim() || options.existing?.code?.trim()) return options.existing;
  const fromId = resolveCurrencyById(options.currencies, options.currencyId);
  if (fromId) return fromId;
  if (options.linked?.symbol?.trim() || options.linked?.code?.trim()) return options.linked;
  return undefined;
}

export function currencyFromCode(code?: string | null): CurrencyLike | undefined {
  if (!code?.trim()) return undefined;
  return { code: code.trim() };
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(ARABIC_LOCALE_LATIN, options);
}

export function formatCurrency(amount: number, symbol = DEFAULT_CURRENCY_SYMBOL): string {
  return `${formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatDocumentCurrency(
  amount: number,
  currency?: CurrencyLike,
  fallback: CurrencyLike | string = DEFAULT_CURRENCY_SYMBOL
): string {
  const fallbackSymbol =
    typeof fallback === 'string' ? fallback : getCurrencySymbol(fallback, DEFAULT_CURRENCY_SYMBOL);
  return formatCurrency(amount, getCurrencySymbol(currency, fallbackSymbol));
}

/** Format amount with document currency; falls back to base currency from master list. */
export function formatAmount(
  amount: number,
  currency?: CurrencyLike | null,
  fallbackCurrency?: CurrencyLike | null
): string {
  const fallbackSymbol = getCurrencySymbol(fallbackCurrency, DEFAULT_CURRENCY_SYMBOL);
  return formatDocumentCurrency(amount, currency ?? undefined, fallbackSymbol);
}

export function formatAmountById(
  amount: number,
  currencyId: string | null | undefined,
  currencies?: CurrencyRecord[]
): string {
  const base = getBaseCurrency(currencies);
  const currency = getDocumentCurrency({ currencyId, currencies });
  return formatAmount(amount, currency, base);
}

/** Per-row report amount uses document currency code when present. */
export function formatReportAmount(
  amount: number,
  currencyCode?: string | null,
  baseCurrency?: CurrencyLike
): string {
  const rowCurrency = currencyFromCode(currencyCode);
  return formatAmount(amount, rowCurrency ?? baseCurrency, baseCurrency);
}

/** Aggregated report / dashboard totals use base currency. */
export function formatReportSummaryAmount(amount: number, baseCurrency?: CurrencyLike): string {
  return formatAmount(amount, baseCurrency, baseCurrency);
}

/** Resolve currency from a list row (document or linked purchase order). */
export function resolveDocumentCurrency(row: {
  currency?: CurrencyLike;
  purchaseOrder?: { currency?: CurrencyLike } | null;
}): CurrencyLike {
  return row.currency ?? row.purchaseOrder?.currency;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(ARABIC_LOCALE_LATIN);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(ARABIC_LOCALE_LATIN);
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
