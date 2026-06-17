'use client';

import { PAYMENT_METHOD_LABELS_AR, PAYMENT_METHOD_VALUES } from '@/lib/constants';

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function PaymentMethodSelect({
  value,
  onChange,
  disabled = false,
  className = 'form-input',
  allowEmpty = true,
  emptyLabel = '-- اختر طريقة الدفع --',
}: PaymentMethodSelectProps) {
  return (
    <select
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {PAYMENT_METHOD_VALUES.map((method) => (
        <option key={method} value={method}>
          {PAYMENT_METHOD_LABELS_AR[method]}
        </option>
      ))}
    </select>
  );
}
