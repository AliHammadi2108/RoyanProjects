'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  filterAutocompleteOptions,
  optionDisplayText,
  type AutocompleteOption,
} from '@/lib/autocomplete';

interface ListSearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  loading?: boolean;
  onDebouncedChange?: (value: string) => void;
  maxSuggestions?: number;
  'aria-label'?: string;
}

export function ListSearchAutocomplete({
  value,
  onChange,
  options,
  placeholder = 'بحث...',
  className,
  debounceMs = 0,
  loading = false,
  onDebouncedChange,
  maxSuggestions = 12,
  'aria-label': ariaLabel,
}: ListSearchAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [internal, setInternal] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  useEffect(() => {
    if (!onDebouncedChange) return;
    timerRef.current = setTimeout(() => onDebouncedChange(internal), debounceMs || 300);
    return () => clearTimeout(timerRef.current);
  }, [internal, debounceMs, onDebouncedChange]);

  const suggestions = useMemo(
    () => filterAutocompleteOptions(options, internal, maxSuggestions),
    [options, internal, maxSuggestions]
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const applyValue = (next: string) => {
    setInternal(next);
    if (!onDebouncedChange || debounceMs === 0) onChange(next);
    else onChange(next);
    setOpen(false);
    setHighlight(0);
  };

  const clear = () => applyValue('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key === 'ArrowDown' && suggestions.length > 0) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && suggestions[highlight]) {
      e.preventDefault();
      applyValue(optionDisplayText(suggestions[highlight]));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        className="form-input text-sm pr-9 pl-9 max-w-xs w-full"
        placeholder={placeholder}
        value={internal}
        dir="rtl"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel || placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setInternal(e.target.value);
          setOpen(true);
          setHighlight(0);
          if (!onDebouncedChange || debounceMs === 0) onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        {internal && !loading && (
          <button
            type="button"
            onClick={clear}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
            aria-label="مسح البحث"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && internal.trim() && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[16rem] max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
        >
          {suggestions.map((opt, idx) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={idx === highlight}
              className={cn(
                'px-3 py-2 cursor-pointer text-right',
                idx === highlight ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'
              )}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyValue(optionDisplayText(opt))}
            >
              <div className="whitespace-normal break-words">{opt.label}</div>
              {opt.sublabel ? (
                <div className="text-xs text-gray-500 mt-0.5">{opt.sublabel}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { SearchEmptyState } from '@/components/ui/SearchBox';
