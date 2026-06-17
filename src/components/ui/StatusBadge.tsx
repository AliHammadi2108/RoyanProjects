import { STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  Draft: 'مسودة',
  'Pending Approval': 'بانتظار الاعتماد',
  Approved: 'معتمد',
  Rejected: 'مرفوض',
  'Returned For Edit': 'مرجع للتعديل',
  Cancelled: 'ملغي',
  Expired: 'منتهي',
  'Partially Received': 'مستلم جزئياً',
  'Fully Received': 'مستلم بالكامل',
  Closed: 'مغلق',
  Posted: 'مرحّل',
  Accepted: 'مقبول',
  'Partially Accepted': 'مقبول جزئياً',
  Unpaid: 'غير مدفوع',
  'Partially Paid': 'مدفوع جزئياً',
  Paid: 'مدفوع',
  Late: 'متأخر',
  Unread: 'غير مقروء',
  Read: 'مقروء',
  Actioned: 'تم الإجراء',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
