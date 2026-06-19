'use client';

import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessToastProps {
  message: string;
  onDismiss: () => void;
  className?: string;
}

export function SuccessToast({ message, onDismiss, className }: SuccessToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-4 left-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2',
        'rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg transition-opacity duration-200',
        className
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
        <p className="flex-1 text-sm font-medium text-green-800">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-0.5 text-green-700 hover:bg-green-100"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
