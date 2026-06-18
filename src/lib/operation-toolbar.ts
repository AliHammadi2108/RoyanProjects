import { EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';

export type OperationMode = 'create' | 'edit' | 'view';

export type OperationType =
  | 'purchase_request'
  | 'quotation'
  | 'comparison'
  | 'nomination'
  | 'purchase_order'
  | 'inspection'
  | 'receiving'
  | 'invoice'
  | 'supplier_payment';

export type ToolbarButtonId =
  | 'new'
  | 'edit'
  | 'save'
  | 'view'
  | 'print'
  | 'back'
  | 'submit'
  | 'approve'
  | 'reject';

export interface OperationConfig {
  permissionPrefix: string;
  listHref: string;
  listLabel: string;
  newHref: string;
  printDocType: string;
  supportsSubmit: boolean;
  supportsWorkflowApproval: boolean;
}

export const OPERATION_CONFIG: Record<OperationType, OperationConfig> = {
  purchase_request: {
    permissionPrefix: 'purchase_requests',
    listHref: '/purchases/requests',
    listLabel: 'قائمة الطلبات',
    newHref: '/purchases/requests/new',
    printDocType: 'purchase_request',
    supportsSubmit: true,
    supportsWorkflowApproval: true,
  },
  quotation: {
    permissionPrefix: 'quotations',
    listHref: '/purchases/quotations',
    listLabel: 'قائمة عروض الأسعار',
    newHref: '/purchases/quotations/new',
    printDocType: 'quotation',
    supportsSubmit: true,
    supportsWorkflowApproval: true,
  },
  comparison: {
    permissionPrefix: 'comparisons',
    listHref: '/purchases/comparisons',
    listLabel: 'قائمة المقارنات',
    newHref: '/purchases/comparisons/new',
    printDocType: 'comparison',
    supportsSubmit: true,
    supportsWorkflowApproval: true,
  },
  nomination: {
    permissionPrefix: 'supplier_selection',
    listHref: '/purchases/supplier-selection',
    listLabel: 'قائمة الترشيحات',
    newHref: '/purchases/supplier-selection/new',
    printDocType: 'nomination',
    supportsSubmit: true,
    supportsWorkflowApproval: true,
  },
  purchase_order: {
    permissionPrefix: 'purchase_orders',
    listHref: '/purchases/orders',
    listLabel: 'قائمة أوامر الشراء',
    newHref: '/purchases/orders/new',
    printDocType: 'purchase_order',
    supportsSubmit: true,
    supportsWorkflowApproval: true,
  },
  inspection: {
    permissionPrefix: 'inspections',
    listHref: '/purchases/inspections',
    listLabel: 'قائمة الفحوصات',
    newHref: '/purchases/inspections/new',
    printDocType: 'inspection',
    supportsSubmit: false,
    supportsWorkflowApproval: false,
  },
  receiving: {
    permissionPrefix: 'receivings',
    listHref: '/purchases/receivings',
    listLabel: 'قائمة إذونات التوريد',
    newHref: '/purchases/receivings/new',
    printDocType: 'receiving',
    supportsSubmit: false,
    supportsWorkflowApproval: false,
  },
  invoice: {
    permissionPrefix: 'invoices',
    listHref: '/purchases/invoices',
    listLabel: 'قائمة الفواتير',
    newHref: '/purchases/invoices/new',
    printDocType: 'invoice',
    supportsSubmit: false,
    supportsWorkflowApproval: false,
  },
  supplier_payment: {
    permissionPrefix: 'supplier_payment',
    listHref: '/purchases/supplier-payments',
    listLabel: 'قائمة سندات الصرف',
    newHref: '/purchases/supplier-payments/new',
    printDocType: 'supplier_payment',
    supportsSubmit: false,
    supportsWorkflowApproval: false,
  },
};

/** Document types saved with internal status but without approval workflow — hide status in UI. */
export const OPERATIONS_WITHOUT_UI_STATUS: OperationType[] = ['invoice', 'supplier_payment'];

export const REPORT_TYPES_WITHOUT_UI_STATUS = new Set(['INVOICE', 'SUPPLIER_PAYMENT']);

export function shouldHideDocumentStatusInUI(operationType: OperationType): boolean {
  return OPERATIONS_WITHOUT_UI_STATUS.includes(operationType);
}

export function shouldHideStatusInReport(documentType: string): boolean {
  return REPORT_TYPES_WITHOUT_UI_STATUS.has(documentType);
}

const LOCKED_STATUSES = ['Approved', 'Posted', 'Closed'];

export interface DocumentToolbarState {
  status?: string;
  isNew?: boolean;
  isUsed?: boolean;
  usage?: UsedDocumentInfo | null;
  approvalStatus?: string;
  canApprove?: boolean;
}

export interface ToolbarButtonState {
  id: ToolbarButtonId;
  label: string;
  visible: boolean;
  disabled: boolean;
  tooltip?: string;
  variant: 'primary' | 'secondary' | 'success' | 'danger';
  href?: string;
  target?: string;
}

export function hasClientPermission(permissions: string[], permission: string): boolean {
  if (permissions.includes('admin')) return true;
  return permissions.includes(permission);
}

export function canPrint(permissions: string[], permissionPrefix: string): boolean {
  return (
    hasClientPermission(permissions, 'operations.print') ||
    hasClientPermission(permissions, `${permissionPrefix}.print`)
  );
}

export function canWhatsApp(permissions: string[], permissionPrefix?: string): boolean {
  if (hasClientPermission(permissions, 'whatsapp.send')) return true;
  if (permissionPrefix && canPrint(permissions, permissionPrefix)) return true;
  return (
    hasClientPermission(permissions, 'operations.print') ||
    hasClientPermission(permissions, 'reports.export')
  );
}

export function isDocumentLocked(status?: string): boolean {
  return !!status && LOCKED_STATUSES.includes(status);
}

export function isDocumentEditable(status?: string, isUsed?: boolean): boolean {
  if (!status) return true;
  if (isUsed) return false;
  return EDITABLE_DOC_STATUSES.includes(status);
}

export function resolveOperationMode(
  isNew: boolean,
  baseEditable: boolean,
  forcedMode?: OperationMode
): OperationMode {
  if (forcedMode) return forcedMode;
  if (isNew) return 'create';
  if (baseEditable) return 'edit';
  return 'view';
}

export function getPrintHref(docType: string, documentId?: string): string | undefined {
  if (!documentId) return undefined;
  return `/purchases/print/${docType}/${documentId}`;
}

export interface ComputeToolbarInput extends DocumentToolbarState {
  operationType: OperationType;
  mode: OperationMode;
  permissions: string[];
  loading?: boolean;
  loadingAction?: ToolbarButtonId | null;
  documentId?: string;
  documentEditable?: boolean;
  saveLabel?: string;
  submitLabel?: string;
}

export function computeToolbarButtons(input: ComputeToolbarInput): ToolbarButtonState[] {
  const config = OPERATION_CONFIG[input.operationType];
  const { permissionPrefix } = config;
  const perms = input.permissions;
  const status = input.status;
  const isUsed = input.isUsed || input.usage?.isUsed;
  const locked = isDocumentLocked(status);
  const editable = input.documentEditable ?? isDocumentEditable(status, isUsed);
  const loading = !!input.loading;

  const canCreate = hasClientPermission(perms, `${permissionPrefix}.create`);
  const canUpdate = hasClientPermission(perms, `${permissionPrefix}.update`);
  const canSubmit = hasClientPermission(perms, `${permissionPrefix}.submit`);
  const canWorkflowApprove =
    hasClientPermission(perms, 'operations.approve') ||
    hasClientPermission(perms, 'approvals.action');
  const canWorkflowReject =
    hasClientPermission(perms, 'operations.reject') ||
    hasClientPermission(perms, 'approvals.action');
  const canPrintDoc = canPrint(perms, permissionPrefix);
  const pendingApproval = input.approvalStatus === 'Pending';
  const draftLike = !status || EDITABLE_DOC_STATUSES.includes(status);

  const noPermission = 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
  const lockedMsg = 'المستند مقفل ولا يمكن تعديله';
  const usedMsg = 'المستند مستخدم في وثيقة لاحقة';
  const notEditableMsg = 'لا يمكن التعديل في حالة المستند الحالية';
  const loadingMsg = 'جاري تنفيذ العملية...';

  const buttons: ToolbarButtonState[] = [];

  buttons.push({
    id: 'back',
    label: 'رجوع',
    visible: true,
    disabled: loading,
    tooltip: loading ? loadingMsg : undefined,
    variant: 'secondary',
    href: config.listHref,
  });

  buttons.push({
    id: 'new',
    label: 'جديد',
    visible: input.mode !== 'create',
    disabled: !canCreate || loading,
    tooltip: !canCreate ? noPermission : loading ? loadingMsg : undefined,
    variant: 'secondary',
    href: config.newHref,
  });

  buttons.push({
    id: 'edit',
    label: 'تعديل',
    visible: input.mode === 'view' && editable,
    disabled: !canUpdate || loading,
    tooltip: !canUpdate ? noPermission : isUsed ? usedMsg : locked ? lockedMsg : loading ? loadingMsg : undefined,
    variant: 'secondary',
  });

  buttons.push({
    id: 'view',
    label: 'استعراض',
    visible: input.mode === 'edit' && !input.isNew,
    disabled: loading,
    tooltip: loading ? loadingMsg : undefined,
    variant: 'secondary',
  });

  const savePerm = input.isNew ? canCreate : canUpdate;
  buttons.push({
    id: 'save',
    label: input.saveLabel || 'حفظ',
    visible: input.mode === 'create' || input.mode === 'edit',
    disabled: !savePerm || loading || (input.mode === 'edit' && !editable),
    tooltip: !savePerm
      ? noPermission
      : !editable
        ? isUsed
          ? usedMsg
          : notEditableMsg
        : loading
          ? loadingMsg
          : undefined,
    variant: 'primary',
  });

  const showSubmit =
    config.supportsSubmit &&
    (input.mode === 'create' || input.mode === 'edit') &&
    draftLike;
  buttons.push({
    id: 'submit',
    label: input.submitLabel || 'اعتماد',
    visible: showSubmit,
    disabled: !canSubmit || loading || (input.mode === 'edit' && !editable),
    tooltip: !canSubmit ? noPermission : !editable ? notEditableMsg : loading ? loadingMsg : undefined,
    variant: 'success',
  });

  const showWorkflowApprove =
    config.supportsWorkflowApproval &&
    input.mode === 'view' &&
    pendingApproval &&
    !!input.canApprove;
  buttons.push({
    id: 'approve',
    label: 'اعتماد',
    visible: showWorkflowApprove,
    disabled: !canWorkflowApprove || loading,
    tooltip: !canWorkflowApprove ? noPermission : loading ? loadingMsg : undefined,
    variant: 'success',
  });

  buttons.push({
    id: 'reject',
    label: 'رفض',
    visible: showWorkflowApprove,
    disabled: !canWorkflowReject || loading,
    tooltip: !canWorkflowReject ? noPermission : loading ? loadingMsg : undefined,
    variant: 'danger',
  });

  buttons.push({
    id: 'print',
    label: 'طباعة',
    visible: !input.isNew && (input.mode === 'view' || input.mode === 'edit'),
    disabled: !canPrintDoc || loading,
    tooltip: !canPrintDoc ? noPermission : loading ? loadingMsg : undefined,
    variant: 'secondary',
    href: getPrintHref(config.printDocType, input.documentId),
    target: '_blank',
  });

  return buttons.filter((b) => b.visible);
}
