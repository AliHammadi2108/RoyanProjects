import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return <div className="p-6 space-y-6 print:p-0 print:space-y-0">{children}</div>;
}

interface StatCardProps {
  title: string;
  total: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  late?: number;
  color?: string;
}

export function StatCard({ title, total, pending = 0, approved = 0, rejected = 0, late = 0, color = 'primary' }: StatCardProps) {
  const colors: Record<string, string> = {
    primary: 'border-r-primary-500',
    green: 'border-r-green-500',
    amber: 'border-r-amber-500',
    red: 'border-r-red-500',
    blue: 'border-r-blue-500',
  };

  return (
    <div className={`card border-r-4 ${colors[color] || colors.primary}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-3">{total}</div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-amber-600">معلق: {pending}</span>
        <span className="text-green-600">معتمد: {approved}</span>
        <span className="text-red-600">مرفوض: {rejected}</span>
        {late > 0 && <span className="text-red-800">متأخر: {late}</span>}
      </div>
    </div>
  );
}
