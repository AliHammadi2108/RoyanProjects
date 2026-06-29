import type { CurrencyDto } from '@/database/repositories/currency.repository';
import type { ItemDto } from '@/database/repositories/item.repository';
import type { SupplierDto } from '@/database/repositories/supplier.repository';
import type { VendorCurrencyDto } from '@/database/repositories/vendor-currency.repository';

type CurrencyLookup = Map<string, CurrencyDto>;

export function toCurrencySettingsRow(c: CurrencyDto) {
  return {
    id: c.code,
    code: c.code,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    symbol: c.code,
    rate: c.rate,
    rateToBase: c.rate,
    isBase: false,
    isActive: c.isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function toSupplierSettingsRow(
  supplier: SupplierDto,
  currencies: VendorCurrencyDto[],
  currencyLookup: CurrencyLookup
) {
  const defaultLink = currencies.find((c) => c.isDefault) ?? currencies[0];
  const defaultCode = defaultLink?.currencyCode ?? null;
  const defaultCurrency = defaultCode ? currencyLookup.get(defaultCode) : undefined;

  return {
    id: supplier.code,
    code: supplier.code,
    accountCode: supplier.accountCode,
    nameAr: supplier.nameAr,
    nameEn: supplier.nameEn,
    phone: supplier.phone,
    mobile: supplier.mobile,
    email: supplier.email,
    address: supplier.address,
    taxNo: supplier.taxNo,
    commercialRegNo: supplier.commercialRegNo,
    notes: supplier.notes,
    isActive: supplier.isActive,
    isPurchaseInactive: supplier.isPurchaseInactive,
    isBlacklisted: supplier.isBlacklisted,
    creditPeriod: supplier.creditPeriod,
    whatsappGroup: supplier.whatsappGroup,
    sendMsg: supplier.sendMsg,
    defaultCurrencyId: defaultCode,
    defaultCurrency: defaultCurrency
      ? { id: defaultCurrency.code, code: defaultCurrency.code, nameAr: defaultCurrency.nameAr }
      : defaultCode
        ? { id: defaultCode, code: defaultCode, nameAr: defaultCode }
        : null,
    currencies: currencies.map((link) => ({
      id: `${supplier.code}-${link.currencyCode}`,
      supplierId: supplier.code,
      currencyId: link.currencyCode,
      isDefault: link.isDefault,
      isActive: !link.isInactive,
      currency: currencyLookup.get(link.currencyCode) ?? {
        id: link.currencyCode,
        code: link.currencyCode,
        nameAr: link.currencyCode,
        nameEn: null,
        symbol: link.currencyCode,
        rate: 1,
        rateToBase: 1,
        isBase: false,
        isActive: !link.isInactive,
      },
    })),
    createdAt: supplier.since ?? new Date(),
    updatedAt: new Date(),
  };
}

export function toItemSettingsRow(item: ItemDto) {
  const baseUnit = item.units.find((u) => u.isMain) ?? item.units[0];
  return {
    id: item.code,
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    barcode: item.barcode,
    description: item.description,
    isActive: item.isActive,
    isStockItem: !item.isService,
    minStock: 0,
    maxStock: null,
    reorderLevelBaseQty: 0,
    reorderQtyBase: null,
    enableReorderAlert: false,
    preferredSupplierId: null,
    preferredSupplier: null,
    categoryId: null,
    category: null,
    unitId: baseUnit?.unit ?? item.units[0]?.unit ?? 'EA',
    itemUnits: item.units.map((u, idx) => ({
      id: `${item.code}-${u.unit}`,
      itemId: item.code,
      unitId: u.unit,
      factorToBase: u.factorToBase,
      isBase: u.isMain,
      isPurchase: u.isPurchase,
      isSale: u.isSale,
      barcode: u.barcode,
      sortOrder: idx,
      unit: { id: u.unit, code: u.unit, nameAr: u.unit, nameEn: u.unit, isActive: u.isActive },
    })),
    itemWarehouseReorders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
