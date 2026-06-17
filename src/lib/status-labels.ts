export const STATUS_LABELS_AR: Record<string, string> = {
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
  Pending: 'قيد الانتظار',
};

export function getStatusLabel(status?: string | null): string | undefined {
  if (!status) return undefined;
  return STATUS_LABELS_AR[status] ?? status;
}
