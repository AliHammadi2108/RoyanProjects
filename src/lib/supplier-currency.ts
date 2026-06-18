export interface SupplierCurrencyLink {
  currencyId: string;
  isDefault: boolean;
  currency?: {
    id: string;
    code: string;
    nameAr: string;
    symbol?: string;
    rateToBase?: number;
    rate?: number;
  };
}

export interface SupplierWithCurrencies {
  id: string;
  defaultCurrencyId?: string | null;
  defaultCurrency?: {
    id: string;
    code: string;
    nameAr?: string;
    rateToBase?: number;
    rate?: number;
  } | null;
  currencies?: SupplierCurrencyLink[];
}

export function getSupplierCurrencyIds(supplier: SupplierWithCurrencies | undefined): string[] {
  if (!supplier) return [];
  const fromJunction = supplier.currencies?.map((c) => c.currencyId) ?? [];
  if (fromJunction.length > 0) return fromJunction;
  if (supplier.defaultCurrencyId) return [supplier.defaultCurrencyId];
  if (supplier.defaultCurrency?.id) return [supplier.defaultCurrency.id];
  return [];
}

export function filterCurrenciesForSupplier<T extends { id: string }>(
  allCurrencies: T[],
  supplier: SupplierWithCurrencies | undefined
): T[] {
  const ids = getSupplierCurrencyIds(supplier);
  if (ids.length === 0) return allCurrencies;
  const allowed = new Set(ids);
  return allCurrencies.filter((c) => allowed.has(c.id));
}

export function resolveSupplierDefaultCurrencyId(
  supplier: SupplierWithCurrencies | undefined
): string | undefined {
  if (!supplier) return undefined;
  const defaultFromJunction = supplier.currencies?.find((c) => c.isDefault)?.currencyId;
  if (defaultFromJunction) return defaultFromJunction;
  return supplier.defaultCurrencyId ?? supplier.defaultCurrency?.id ?? undefined;
}

export function resolveCurrencyOnSupplierChange(
  supplier: SupplierWithCurrencies | undefined,
  currentCurrencyId?: string | null
): string {
  const allowed = getSupplierCurrencyIds(supplier);
  const defaultId = resolveSupplierDefaultCurrencyId(supplier);

  if (allowed.length === 1) return allowed[0];
  if (currentCurrencyId && allowed.includes(currentCurrencyId)) return currentCurrencyId;
  if (defaultId && allowed.includes(defaultId)) return defaultId;
  return allowed[0] ?? defaultId ?? currentCurrencyId ?? '';
}
