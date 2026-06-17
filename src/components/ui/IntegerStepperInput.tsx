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
    'inline-flex shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-50 p-1 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={cn('inline-flex w-full items-center gap-0.5', className)} dir="ltr">
      <button
        type="button"
        className={buttonClass}
        onClick={() => adjust(-1)}
        disabled={disabled || coerceInteger(value, min) <= min}
        aria-label="تقليل"
        tabIndex={-1}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        min={min}
        step={step}
        className={cn('form-input min-w-0 flex-1 px-1 py-1 text-center text-sm', inputClassName)}
        value={displayValue}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
        }}
        disabled={disabled}
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
