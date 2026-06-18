export interface ItemUnitOption {
  id: string;
  unitId: string;
  factorToBase: number;
  isDefaultPurchase: boolean;
  isDefaultSale: boolean;
  isBase: boolean;
  unit?: { nameAr: string; symbol?: string | null };
}

export interface MasterData {
  branches: Array<{ id: string; nameAr: string; code?: string }>;
  departments: Array<{ id: string; nameAr: string; branchId?: string | null }>;
  warehouses: Array<{ id: string; nameAr: string; branchId?: string | null }>;
  suppliers: Array<{
    id: string;
    nameAr: string;
    code?: string;
    defaultCurrencyId?: string | null;
    defaultCurrency?: { id: string; code: string; rateToBase?: number; rate?: number } | null;
    currencies?: Array<{
      currencyId: string;
      isDefault: boolean;
      currency?: { id: string; code: string; nameAr: string; symbol?: string; rateToBase?: number; rate?: number };
    }>;
  }>;
  currencies: Array<{
    id: string;
    code: string;
    nameAr: string;
    symbol?: string;
    rateToBase?: number;
    rate?: number;
    isBase?: boolean;
  }>;
  items: Array<{
    id: string;
    code: string;
    nameAr: string;
    unitId?: string | null;
    legacyUnit?: { nameAr: string } | null;
    itemUnits?: ItemUnitOption[];
  }>;
  units?: Array<{ id: string; nameAr: string; code: string; symbol?: string | null }>;
}
