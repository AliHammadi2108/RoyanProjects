import { describe, it, expect } from 'vitest';
import {
  filterAutocompleteOptions,
  matchesAutocompleteQuery,
  normalizeSearchQuery,
  type AutocompleteOption,
} from '@/lib/autocomplete';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';

const sampleOptions: AutocompleteOption[] = [
  { value: '1', label: 'ITM-001 - صنف تجريبي', keywords: 'ITM-001 barcode123', filterText: 'ITM-001' },
  { value: '2', label: 'ITM-002 - مادة خام', keywords: 'ITM-002', filterText: 'ITM-002' },
  { value: '3', label: 'SUP-01 - مورد محلي', keywords: 'SUP-01 0500000000', filterText: 'SUP-01' },
];

describe('autocomplete utilities', () => {
  it('normalizes search query', () => {
    expect(normalizeSearchQuery('  ABC ')).toBe('abc');
  });

  it('matches option by label and keywords', () => {
    expect(matchesAutocompleteQuery(sampleOptions[0], 'barcode')).toBe(true);
    expect(matchesAutocompleteQuery(sampleOptions[0], 'xyz')).toBe(false);
  });

  it('filters options with limit', () => {
    const result = filterAutocompleteOptions(sampleOptions, 'itm', 1);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('1');
  });

  it('returns top options when query empty', () => {
    expect(filterAutocompleteOptions(sampleOptions, '', 2)).toHaveLength(2);
  });
});

describe('search mappings', () => {
  it('searches items by code and barcode', () => {
    const rows = [
      { code: 'A1', nameAr: 'أول', barcode: '111' },
      { code: 'B2', nameAr: 'ثاني', barcode: '222' },
    ];
    const filtered = clientSearchMapped(rows, '111', SEARCH_MAPPINGS.item);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].code).toBe('A1');
  });
});
