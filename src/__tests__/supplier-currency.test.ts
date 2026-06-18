import { describe, it, expect } from 'vitest';
import {
  filterCurrenciesForSupplier,
  getSupplierCurrencyIds,
  resolveCurrencyOnSupplierChange,
  resolveSupplierDefaultCurrencyId,
} from '@/lib/supplier-currency';
import { assertSupplierCurrencyAllowed } from '@/services/supplier-currency.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allCurrencies = [
  { id: 'sar', code: 'SAR', nameAr: 'ريال' },
  { id: 'usd', code: 'USD', nameAr: 'دولار' },
  { id: 'eur', code: 'EUR', nameAr: 'يورو' },
];

describe('supplier-currency helpers', () => {
  it('reads currency ids from junction rows', () => {
    const supplier = {
      id: 's1',
      defaultCurrencyId: 'sar',
      currencies: [
        { currencyId: 'sar', isDefault: true },
        { currencyId: 'usd', isDefault: false },
      ],
    };

    expect(getSupplierCurrencyIds(supplier)).toEqual(['sar', 'usd']);
    expect(resolveSupplierDefaultCurrencyId(supplier)).toBe('sar');
    expect(filterCurrenciesForSupplier(allCurrencies, supplier)).toHaveLength(2);
  });

  it('falls back to defaultCurrencyId when junction is empty', () => {
    const supplier = { id: 's1', defaultCurrencyId: 'usd' };
    expect(getSupplierCurrencyIds(supplier)).toEqual(['usd']);
    expect(resolveCurrencyOnSupplierChange(supplier, 'eur')).toBe('usd');
  });

  it('auto-selects single supplier currency', () => {
    const supplier = {
      id: 's1',
      currencies: [{ currencyId: 'usd', isDefault: true }],
    };
    expect(resolveCurrencyOnSupplierChange(supplier, 'sar')).toBe('usd');
  });

  it('keeps current currency when still allowed', () => {
    const supplier = {
      id: 's1',
      currencies: [
        { currencyId: 'sar', isDefault: true },
        { currencyId: 'usd', isDefault: false },
      ],
    };
    expect(resolveCurrencyOnSupplierChange(supplier, 'usd')).toBe('usd');
  });
});

describe('supplier-currency service', () => {
  it('rejects currency not linked to supplier', async () => {
    const supplier = await prisma.supplier.findFirst({
      include: { currencies: true },
    });
    const foreignCurrency = await prisma.currency.findFirst({
      where: {
        id: { notIn: supplier?.currencies.map((c) => c.currencyId) ?? [] },
      },
    });

    if (!supplier || !foreignCurrency) return;

    await expect(
      assertSupplierCurrencyAllowed(supplier.id, foreignCurrency.id)
    ).rejects.toThrow('غير مرتبطة');
  });

  it('allows supplier default currency', async () => {
    const supplier = await prisma.supplier.findFirst({
      where: { defaultCurrencyId: { not: null } },
    });
    if (!supplier?.defaultCurrencyId) return;

    await expect(
      assertSupplierCurrencyAllowed(supplier.id, supplier.defaultCurrencyId)
    ).resolves.toBeUndefined();
  });
});
