'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface PrintFooterProps {
  printedBy: string;
  printedAt?: string;
}

export function PrintFooter({ printedBy, printedAt: printedAtProp }: PrintFooterProps) {
  const [printedAt, setPrintedAt] = useState(printedAtProp ?? '');

  useEffect(() => {
    if (!printedAtProp) {
      setPrintedAt(formatDateTime(new Date()));
    }
  }, [printedAtProp]);

  if (!printedBy) return null;

  return (
    <div
      className="print-footer border-t border-gray-300 pt-3 mt-6 text-xs text-gray-600 text-right print:mt-8 print:pt-2 print:text-[10px] print:border-gray-400"
      dir="rtl"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <span className="text-gray-500">طُبع بواسطة: </span>
          <span className="font-medium text-gray-800">{printedBy}</span>
        </div>
        <div>
          <span className="text-gray-500">تاريخ ووقت الطباعة: </span>
          <span className="font-medium text-gray-800">{printedAt || '...'}</span>
        </div>
      </div>
    </div>
  );
}
