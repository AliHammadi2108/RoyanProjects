'use client';

import { useState } from 'react';
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
  const displayValue = draft ?? String(value);

  const commit = (raw: string) => {
    setDraft(null);
    onChange(coerceInteger(raw, min));
  };

  const adjust = (delta: number) => {
    setDraft(null);
    onChange(stepInteger(value, delta * step, min));
  };

  const buttonClass =
    'absolute top-1/2 z-[1] inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={cn('relative w-full', className)} dir="ltr">
      <button
        type="button"
        className={cn(buttonClass, 'left-1')}
        onClick={() => adjust(-1)}
        disabled={disabled || coerceInteger(value, min) <= min}
        aria-label="تقليل"
        tabIndex={-1}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          'form-input w-full px-9 py-2 text-center text-sm tabular-nums',
          inputClassName
        )}
        value={displayValue}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className={cn(buttonClass, 'right-1')}
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
