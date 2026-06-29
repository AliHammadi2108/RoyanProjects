import { prisma } from '@/lib/db';
import { isOracleMode } from '@/database/provider';

export async function assertSupplierCurrencyAllowed(
  supplierId: string,
  currencyId: string | null | undefined
) {
  if (!currencyId) return;

  if (isOracleMode()) {
    const { assertVendorCurrencyAllowed } = await import(
      '@/database/repositories/vendor-currency.repository'
    );
    return assertVendorCurrencyAllowed(supplierId, currencyId);
  }

  const links = await prisma.supplierCurrency.findMany({
    where: { supplierId },
    select: { currencyId: true },
  });

  if (links.length > 0) {
    if (!links.some((l) => l.currencyId === currencyId)) {
      throw new Error('العملة المختارة غير مرتبطة بهذا المورد');
    }
    return;
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { defaultCurrencyId: true },
  });

  if (supplier?.defaultCurrencyId && supplier.defaultCurrencyId !== currencyId) {
    throw new Error('العملة المختارة غير مرتبطة بهذا المورد');
  }
}

/** يزامن جدول الربط من defaultCurrencyId للموردين القدامى */
export async function syncSupplierCurrenciesFromDefault(supplierId?: string) {
  const suppliers = await prisma.supplier.findMany({
    where: {
      ...(supplierId ? { id: supplierId } : {}),
      defaultCurrencyId: { not: null },
    },
    select: { id: true, defaultCurrencyId: true },
  });

  for (const supplier of suppliers) {
    if (!supplier.defaultCurrencyId) continue;

    const existing = await prisma.supplierCurrency.count({
      where: { supplierId: supplier.id },
    });
    if (existing > 0) continue;

    await prisma.supplierCurrency.create({
      data: {
        supplierId: supplier.id,
        currencyId: supplier.defaultCurrencyId,
        isDefault: true,
      },
    });
  }
}

export async function replaceSupplierCurrencies(
  supplierId: string,
  currencyIds: string[],
  defaultCurrencyId: string
) {
  const uniqueIds = Array.from(new Set(currencyIds));
  if (!uniqueIds.includes(defaultCurrencyId)) {
    throw new Error('العملة الافتراضية يجب أن تكون ضمن العملات المختارة');
  }

  await prisma.supplierCurrency.deleteMany({ where: { supplierId } });
  if (uniqueIds.length > 0) {
    await prisma.supplierCurrency.createMany({
      data: uniqueIds.map((currencyId) => ({
        supplierId,
        currencyId,
        isDefault: currencyId === defaultCurrencyId,
      })),
    });
  }
}
