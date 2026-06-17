'use client';

interface ReportFiltersBarProps {
  children: React.ReactNode;
  onApply: () => void;
  onReset: () => void;
}

export function ReportFiltersBar({ children, onApply, onReset }: ReportFiltersBarProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={onReset} className="btn-secondary text-sm">
          إعادة تعيين
        </button>
        <button type="button" onClick={onApply} className="btn-primary text-sm">
          تطبيق الفلاتر
        </button>
      </div>
    </div>
  );
}

interface ReportFilterFieldProps {
  label: string;
  children: React.ReactNode;
}

export function ReportFilterField({ label, children }: ReportFilterFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export function reportSelectClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
}

export function reportInputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
}
