export interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
  /** Text used when selecting from list-filter autocomplete */
  filterText?: string;
  keywords?: string;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesAutocompleteQuery(option: AutocompleteOption, query: string): boolean {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  const haystack = [option.label, option.sublabel, option.keywords, option.filterText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterAutocompleteOptions(
  options: AutocompleteOption[],
  query: string,
  limit = 12
): AutocompleteOption[] {
  const q = normalizeSearchQuery(query);
  if (!q) return options.slice(0, limit);
  return options.filter((opt) => matchesAutocompleteQuery(opt, q)).slice(0, limit);
}

export function optionDisplayText(option: AutocompleteOption): string {
  return option.filterText || option.label;
}
