'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  filterAutocompleteOptions,
  type AutocompleteOption,
} from '@/lib/autocomplete';

export interface AutocompleteSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: AutocompleteOption[];
  onSearch?: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  clearable?: boolean;
  allowEmpty?: boolean;
  debounceMs?: number;
  minChars?: number;
  noResultsText?: string;
  loadingText?: string;
  'aria-label'?: string;
}

export function AutocompleteSelect({
  value,
  onChange,
  options = [],
  onSearch,
  placeholder = 'ابحث واختر...',
  emptyLabel = '-- اختر --',
  disabled = false,
  className,
  inputClassName,
  clearable = true,
  allowEmpty = true,
  debounceMs = 300,
  minChars = 0,
  noResultsText = 'لا توجد نتائج',
  loadingText = 'جاري البحث...',
  'aria-label': ariaLabel,
}: AutocompleteSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState<AutocompleteOption[]>([]);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? asyncOptions.find((o) => o.value === value),
    [options, asyncOptions, value]
  );

  const displayValue = open ? query : selected?.label ?? '';

  const localFiltered = useMemo(
    () => filterAutocompleteOptions(options, query),
    [options, query]
  );

  const visibleOptions = onSearch ? asyncOptions : localFiltered;

  const runSearch = useCallback(
    async (q: string) => {
      if (!onSearch) return;
      if (q.trim().length < minChars) {
        setAsyncOptions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await onSearch(q);
        setAsyncOptions(results);
        setHighlight(0);
      } finally {
        setLoading(false);
      }
    },
    [onSearch, minChars]
  );

  useEffect(() => {
    if (!onSearch || !open) return;
    debounceRef.current = setTimeout(() => runSearch(query), debounceMs);
    return () => clearTimeout(debounceRef.current);
  }, [query, onSearch, open, debounceMs, runSearch]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selectOption = (opt: AutocompleteOption | null) => {
    if (!opt) {
      onChange('');
    } else {
      onChange(opt.value);
    }
    setOpen(false);
    setQuery('');
    setHighlight(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(visibleOptions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visibleOptions[highlight]) selectOption(visibleOptions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={cn('form-input text-sm w-full pr-9 pl-9', inputClassName)}
          value={displayValue}
          placeholder={allowEmpty ? emptyLabel : placeholder}
          disabled={disabled}
          dir="rtl"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel || placeholder}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setQuery(selected?.label ?? '');
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value && allowEmpty) onChange('');
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {clearable && value && !disabled && !loading && (
            <button
              type="button"
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
              aria-label="مسح الاختيار"
              onClick={() => selectOption(null)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
        >
          {loading && visibleOptions.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">{loadingText}</li>
          ) : visibleOptions.length === 0 ? (
            <li className="px-3 py-2 text-gray-500">{noResultsText}</li>
          ) : (
            visibleOptions.map((opt, idx) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                className={cn(
                  'px-3 py-2 cursor-pointer text-right',
                  idx === highlight ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50',
                  value === opt.value && 'font-medium'
                )}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
              >
                <div className="whitespace-normal break-words">{opt.label}</div>
                {opt.sublabel ? (
                  <div className="text-xs text-gray-500 mt-0.5">{opt.sublabel}</div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
