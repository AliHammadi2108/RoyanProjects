export const DOCUMENT_TYPES = {
  PURCHASE_REQUEST: 'PURCHASE_REQUEST',
  QUOTATION: 'QUOTATION',
  TECHNICAL_COMPARISON: 'TECHNICAL_COMPARISON',
  SUPPLIER_NOMINATION: 'SUPPLIER_NOMINATION',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  SUPPLIER_PAYMENT: 'SUPPLIER_PAYMENT',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_STATUS = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED_FOR_EDIT: 'Returned For Edit',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  PARTIALLY_RECEIVED: 'Partially Received',
  FULLY_RECEIVED: 'Fully Received',
  CLOSED: 'Closed',
  POSTED: 'Posted',
} as const;

/** Purchase invoices eligible for supplier payment allocation */
export const PAYABLE_INVOICE_STATUSES = [
  DOCUMENT_STATUS.DRAFT,
  DOCUMENT_STATUS.APPROVED,
  DOCUMENT_STATUS.POSTED,
] as const;

export const OPERATION_TO_DOCUMENT_TYPE: Record<string, string> = {
  purchase_request: DOCUMENT_TYPES.PURCHASE_REQUEST,
  quotation: DOCUMENT_TYPES.QUOTATION,
  comparison: DOCUMENT_TYPES.TECHNICAL_COMPARISON,
  nomination: DOCUMENT_TYPES.SUPPLIER_NOMINATION,
  purchase_order: DOCUMENT_TYPES.PURCHASE_ORDER,
  supplier_payment: DOCUMENT_TYPES.SUPPLIER_PAYMENT,
};

export const APPROVAL_STATUS = {
  NONE: 'None',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED: 'Returned',
} as const;

export const PURCHASE_STAGES = {
  PURCHASE_REQUEST: 'PURCHASE_REQUEST',
  QUOTATION: 'QUOTATION',
  TECHNICAL_COMPARISON: 'TECHNICAL_COMPARISON',
  SUPPLIER_NOMINATION: 'SUPPLIER_NOMINATION',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  INSPECTION: 'INSPECTION',
  RECEIVING: 'RECEIVING',
  INVOICE: 'INVOICE',
  COMPLETED: 'COMPLETED',
} as const;

export const NEXT_ACTIONS: Record<string, string> = {
  PURCHASE_REQUEST: 'في انتظار اعتماد طلب الشراء',
  QUOTATION: 'في انتظار عرض السعر',
  QUOTATION_APPROVAL: 'في انتظار اعتماد عرض السعر',
  TECHNICAL_COMPARISON: 'في انتظار المقارنة الفنية',
  SUPPLIER_NOMINATION: 'في انتظار اختيار المورد',
  PURCHASE_ORDER: 'في انتظار أمر الشراء',
  PURCHASE_ORDER_APPROVAL: 'في انتظار اعتماد أمر الشراء',
  INSPECTION: 'في انتظار الفحص',
  RECEIVING: 'في انتظار التوريد',
  INVOICE: 'في انتظار الفاتورة',
  COMPLETED: 'مكتملة',
};

export const NOTIFICATION_TYPES = {
  APPROVAL_REQUEST: 'APPROVAL_REQUEST',
  APPROVAL_APPROVED: 'APPROVAL_APPROVED',
  APPROVAL_REJECTED: 'APPROVAL_REJECTED',
  APPROVAL_RETURNED: 'APPROVAL_RETURNED',
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  PURCHASE_STAGE_COMPLETED: 'PURCHASE_STAGE_COMPLETED',
  PURCHASE_DELAYED: 'PURCHASE_DELAYED',
  REMINDER: 'REMINDER',
  REORDER_ALERT: 'REORDER_ALERT',
} as const;

export const INSPECTION_RESULTS = {
  ACCEPTED: 'Accepted',
  PARTIALLY_ACCEPTED: 'Partially Accepted',
  REJECTED: 'Rejected',
} as const;

export const DOCUMENT_PREFIXES: Record<string, string> = {
  PURCHASE_REQUEST: 'PR',
  QUOTATION: 'QT',
  TECHNICAL_COMPARISON: 'TC',
  SUPPLIER_NOMINATION: 'SN',
  PURCHASE_ORDER: 'PO',
  INSPECTION: 'PI',
  RECEIVING: 'GR',
  INVOICE: 'INV',
  PURCHASE_CYCLE: 'PC',
  SUPPLIER_PAYMENT: 'SPV',
};

export const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  'Pending Approval': 'bg-amber-100 text-amber-800 border-amber-300',
  Approved: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
  'Returned For Edit': 'bg-blue-100 text-blue-800 border-blue-300',
  Cancelled: 'bg-gray-200 text-gray-600 border-gray-400',
  Expired: 'bg-orange-100 text-orange-800 border-orange-300',
  'Partially Received': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Fully Received': 'bg-green-100 text-green-800 border-green-300',
  Closed: 'bg-slate-100 text-slate-700 border-slate-300',
  Posted: 'bg-green-100 text-green-800 border-green-300',
  Late: 'bg-red-200 text-red-900 border-red-500',
};

export const DOCUMENT_ROUTES: Record<string, string> = {
  PURCHASE_REQUEST: '/purchases/requests',
  QUOTATION: '/purchases/quotations',
  TECHNICAL_COMPARISON: '/purchases/comparisons',
  SUPPLIER_NOMINATION: '/purchases/supplier-selection',
  PURCHASE_ORDER: '/purchases/orders',
  INSPECTION: '/purchases/inspections',
  RECEIVING: '/purchases/receivings',
  INVOICE: '/purchases/invoices',
  SUPPLIER_PAYMENT: '/purchases/supplier-payments',
};

export const DOCUMENT_LABELS_AR: Record<string, string> = {
  PURCHASE_REQUEST: 'طلب شراء',
  QUOTATION: 'عرض سعر',
  TECHNICAL_COMPARISON: 'مقارنة فنية',
  SUPPLIER_NOMINATION: 'ترشيح مورد',
  PURCHASE_ORDER: 'أمر شراء',
  INSPECTION: 'فحص',
  RECEIVING: 'إذن توريد',
  INVOICE: 'فاتورة مشتريات',
  SUPPLIER_PAYMENT: 'سند صرف مورد',
};

/** قيم طريقة الدفع المخزنة في قاعدة البيانات */
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CREDIT: 'credit',
  BANK: 'bank',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_VALUES = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.CREDIT,
  PAYMENT_METHODS.BANK,
] as const;

/** التسميات العربية المعروضة للمستخدم */
export const PAYMENT_METHOD_LABELS_AR: Record<PaymentMethod, string> = {
  cash: 'نقد',
  credit: 'آجل',
  bank: 'بنكي',
};

const LEGACY_PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  نقد: PAYMENT_METHODS.CASH,
  آجل: PAYMENT_METHODS.CREDIT,
  اجل: PAYMENT_METHODS.CREDIT,
  بنكي: PAYMENT_METHODS.BANK,
  cash: PAYMENT_METHODS.CASH,
  credit: PAYMENT_METHODS.CREDIT,
  bank: PAYMENT_METHODS.BANK,
};

export function isPaymentMethod(value: string | null | undefined): value is PaymentMethod {
  return !!value && PAYMENT_METHOD_VALUES.includes(value as PaymentMethod);
}

export function normalizePaymentMethod(value: string | null | undefined): PaymentMethod | '' {
  if (!value) return '';
  const trimmed = value.trim();
  if (isPaymentMethod(trimmed)) return trimmed;
  return LEGACY_PAYMENT_METHOD_MAP[trimmed] ?? LEGACY_PAYMENT_METHOD_MAP[trimmed.toLowerCase()] ?? '';
}

export function getPaymentMethodLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const normalized = normalizePaymentMethod(value);
  if (normalized) return PAYMENT_METHOD_LABELS_AR[normalized];
  return value;
}
