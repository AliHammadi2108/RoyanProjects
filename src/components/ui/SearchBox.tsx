'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  loading?: boolean;
  onDebouncedChange?: (value: string) => void;
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'بحث...',
  className,
  debounceMs = 0,
  loading = false,
  onDebouncedChange,
}: SearchBoxProps) {
  const [internal, setInternal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setInternal(value);
  }, [value]);

  useEffect(() => {
    if (!onDebouncedChange) return;
    timerRef.current = setTimeout(() => onDebouncedChange(internal), debounceMs || 300);
    return () => clearTimeout(timerRef.current);
  }, [internal, debounceMs, onDebouncedChange]);

  const handleChange = (next: string) => {
    setInternal(next);
    if (!onDebouncedChange || debounceMs === 0) {
      onChange(next);
    }
  };

  const clear = () => {
    setInternal('');
    onChange('');
    onDebouncedChange?.('');
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        className="form-input text-sm pr-9 pl-9 max-w-xs w-full"
        placeholder={placeholder}
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        dir="rtl"
        aria-label={placeholder}
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
    </div>
  );
}

interface SearchEmptyStateProps {
  query: string;
  message?: string;
}

export function SearchEmptyState({ query, message }: SearchEmptyStateProps) {
  if (!query) return null;
  return (
    <p className="text-sm text-gray-500 text-center py-4">
      {message || `لا توجد نتائج لـ "${query}"`}
    </p>
  );
}
