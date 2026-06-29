import { prisma } from '@/lib/db';
import { getDatabaseProvider, isOracleMode, type DatabaseProvider } from './provider';

import * as supplierRepo from './repositories/supplier.repository';
import * as vendorCurrencyRepo from './repositories/vendor-currency.repository';
import * as currencyRepo from './repositories/currency.repository';
import * as itemRepo from './repositories/item.repository';
import * as warehouseRepo from './repositories/warehouse.repository';
import * as purchaseRequestRepo from './repositories/purchase-request.repository';
import * as quotationRepo from './repositories/quotation.repository';
import * as comparisonRepo from './repositories/comparison.repository';
import * as nominationRepo from './repositories/nomination.repository';
import * as purchaseOrderRepo from './repositories/purchase-order.repository';
import * as inspectionRepo from './repositories/inspection.repository';
import * as receivingRepo from './repositories/receiving.repository';
import * as invoiceRepo from './repositories/invoice.repository';

export type OracleDb = {
  provider: 'oracle';
  suppliers: typeof supplierRepo;
  vendorCurrencies: typeof vendorCurrencyRepo;
  currencies: typeof currencyRepo;
  items: typeof itemRepo;
  warehouses: typeof warehouseRepo;
  purchaseRequests: typeof purchaseRequestRepo;
  quotations: typeof quotationRepo;
  comparisons: typeof comparisonRepo;
  nominations: typeof nominationRepo;
  purchaseOrders: typeof purchaseOrderRepo;
  inspections: typeof inspectionRepo;
  receivings: typeof receivingRepo;
  invoices: typeof invoiceRepo;
};

export type SqliteDb = {
  provider: 'sqlite';
  prisma: typeof prisma;
};

export type AppDatabase = OracleDb | SqliteDb;

/** Factory — sqlite (Prisma) by default; oracle uses repository layer. */
export function getDb(): AppDatabase {
  if (isOracleMode()) {
    return {
      provider: 'oracle',
      suppliers: supplierRepo,
      vendorCurrencies: vendorCurrencyRepo,
      currencies: currencyRepo,
      items: itemRepo,
      warehouses: warehouseRepo,
      purchaseRequests: purchaseRequestRepo,
      quotations: quotationRepo,
      comparisons: comparisonRepo,
      nominations: nominationRepo,
      purchaseOrders: purchaseOrderRepo,
      inspections: inspectionRepo,
      receivings: receivingRepo,
      invoices: invoiceRepo,
    };
  }
  return { provider: 'sqlite', prisma };
}

export { getDatabaseProvider, isOracleMode };
export type { DatabaseProvider };
