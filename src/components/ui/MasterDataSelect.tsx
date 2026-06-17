'use client';

import { useCallback, useMemo } from 'react';
import { AutocompleteSelect } from '@/components/ui/AutocompleteSelect';
import type { AutocompleteOption } from '@/lib/autocomplete';
import {
  searchBranches,
  searchCurrencies,
  searchDepartments,
  searchSuppliers,
  searchWarehouses,
} from '@/actions/search';

export type MasterDataSelectKind =
  | 'branch'
  | 'department'
  | 'warehouse'
  | 'supplier'
  | 'currency';

interface BaseOption {
  id: string;
  nameAr: string;
  code?: string;
}

interface MasterDataSelectProps {
  kind: MasterDataSelectKind;
  value: string;
  onChange: (value: string) => void;
  options: BaseOption[];
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  branchId?: string;
  asyncSearch?: boolean;
}

function toOption(
  row: BaseOption & { phone?: string | null; symbol?: string; defaultCurrencyId?: string | null },
  kind: MasterDataSelectKind
): AutocompleteOption {
  const code = row.code ? `${row.code} - ` : '';
  const label = `${code}${row.nameAr}`;
  const keywords = [row.code, row.nameAr, row.phone, row.symbol].filter(Boolean).join(' ');
  return {
    value: row.id,
    label,
    sublabel: kind === 'supplier' && row.phone ? `هاتف: ${row.phone}` : row.symbol || undefined,
    keywords,
    filterText: label,
  };
}

export function MasterDataSelect({
  kind,
  value,
  onChange,
  options,
  disabled,
  className,
  allowEmpty = true,
  emptyLabel,
  branchId,
  asyncSearch = true,
}: MasterDataSelectProps) {
  const localOptions = useMemo(
    () => options.map((o) => toOption(o, kind)),
    [options, kind]
  );

  const onSearch = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      if (!asyncSearch) return localOptions;
      switch (kind) {
        case 'supplier': {
          const rows = await searchSuppliers(query);
          return rows.map((r) => toOption(r, kind));
        }
        case 'currency': {
          const rows = await searchCurrencies(query);
          return rows.map((r) => toOption(r, kind));
        }
        case 'warehouse': {
          const rows = await searchWarehouses(query);
          return rows.map((r) => toOption(r, kind));
        }
        case 'branch': {
          const rows = await searchBranches(query);
          return rows.map((r) => toOption(r, kind));
        }
        case 'department': {
          const rows = await searchDepartments(query, branchId);
          return rows.map((r) => toOption(r, kind));
        }
        default:
          return localOptions;
      }
    },
    [asyncSearch, kind, branchId, localOptions]
  );

  const placeholders: Record<MasterDataSelectKind, string> = {
    branch: 'ابحث عن فرع...',
    department: 'ابحث عن إدارة...',
    warehouse: 'ابحث عن مخزن...',
    supplier: 'ابحث عن مورد...',
    currency: 'ابحث عن عملة...',
  };

  const emptyLabels: Record<MasterDataSelectKind, string> = {
    branch: '-- اختر فرعاً --',
    department: '-- اختر إدارة --',
    warehouse: '-- اختر مخزناً --',
    supplier: '-- اختر مورداً --',
    currency: '-- اختر عملة --',
  };

  return (
    <AutocompleteSelect
      value={value}
      onChange={onChange}
      options={localOptions}
      onSearch={asyncSearch ? onSearch : undefined}
      disabled={disabled}
      className={className}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel || emptyLabels[kind]}
      placeholder={placeholders[kind]}
      minChars={0}
    />
  );
}
