'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportGridColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'right' | 'left' | 'center';
  render?: (row: T) => React.ReactNode;
}

interface ReportGridProps<T = Record<string, unknown>> {
  columns: ReportGridColumn<T>[];
  rows: T[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  drillDownRoute?: (row: T) => string | undefined;
  emptyMessage?: string;
}

export function ReportGrid<T = Record<string, unknown>>({
  columns,
  rows,
  sortBy,
  sortDir = 'desc',
  onSort,
  rowKey,
  onRowClick,
  drillDownRoute,
  emptyMessage = 'لا توجد بيانات',
}: ReportGridProps<T>) {
  const router = useRouter();

  const handleRowClick = (row: T) => {
    if (onRowClick) {
      onRowClick(row);
      return;
    }
    const route = drillDownRoute?.(row);
    if (route) router.push(route);
  };

  const clickable = Boolean(onRowClick || drillDownRoute);

  const alignClass = useMemo(
    () =>
      ({
        right: 'text-right',
        left: 'text-left',
        center: 'text-center',
      }) as const,
    []
  );

  if (rows.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-500 text-sm">{emptyMessage}</div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-medium text-gray-700 whitespace-nowrap',
                    alignClass[col.align || 'right'],
                    col.sortable && onSort && 'cursor-pointer select-none hover:bg-gray-100'
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortBy === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const key = rowKey ? rowKey(row) : String((row as Record<string, unknown>).id ?? idx);
              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    clickable && 'cursor-pointer'
                  )}
                  onClick={() => clickable && handleRowClick(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-2.5 text-gray-800',
                        alignClass[col.align || 'right']
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
