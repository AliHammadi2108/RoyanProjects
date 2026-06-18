'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { coerceInteger, stepInteger } from '@/lib/integer-stepper';

interface IntegerStepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  'aria-label'?: string;
}

function isPartialNumericInput(raw: string, min: number): boolean {
  if (raw === '') return true;
  if (min < 0) return /^-?\d*$/.test(raw);
  return /^\d*$/.test(raw);
}

export function IntegerStepperInput({
  value,
  onChange,
  min = 0,
  step = 1,
  disabled,
  className,
  inputClassName,
  'aria-label': ariaLabel,
}: IntegerStepperInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const focusedRef = useRef(false);
  const displayValue = draft ?? String(value);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(null);
    }
  }, [value]);

  const commit = (raw: string) => {
    setDraft(null);
    onChange(coerceInteger(raw, min));
  };

  const currentNumeric = () =>
    draft !== null ? coerceInteger(draft, min) : coerceInteger(value, min);

  const adjust = (delta: number) => {
    setDraft(null);
    onChange(stepInteger(currentNumeric(), delta * step, min));
  };

  const buttonClass =
    'inline-flex h-full shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 px-1.5 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={cn('flex w-full items-stretch gap-1', className)} dir="ltr">
      <button
        type="button"
        className={buttonClass}
        onClick={() => adjust(-1)}
        disabled={disabled || currentNumeric() <= min}
        aria-label="تقليل"
        tabIndex={-1}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          'form-input min-w-0 flex-1 px-2 py-2 text-center text-sm tabular-nums',
          inputClassName
        )}
        value={displayValue}
        onChange={(e) => {
          const next = e.target.value;
          if (isPartialNumericInput(next, min)) {
            setDraft(next);
          }
        }}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={disabled}
        readOnly={false}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className={buttonClass}
        onClick={() => adjust(1)}
        disabled={disabled}
        aria-label="زيادة"
        tabIndex={-1}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
