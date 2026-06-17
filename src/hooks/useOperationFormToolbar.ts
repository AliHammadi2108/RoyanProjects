'use client';

import { useCallback, useEffect, useMemo, useState, createElement } from 'react';
import { checkCanApprove, processApproval } from '@/actions/common';
import { confirmToolbarAction, type OperationToolbarProps } from '@/components/ui/OperationToolbar';
import { DocumentWhatsAppButton } from '@/components/ui/DocumentWhatsAppButton';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';
import { useOperationToolbar } from '@/hooks/useOperationToolbar';
import type { OperationType, ToolbarButtonId } from '@/lib/operation-toolbar';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ApprovalLike {
  id: string;
  status: string;
}

export interface WhatsAppFormMeta {
  total?: string;
  supplierPhone?: string | null;
  partyName?: string;
  documentDate?: string;
}

export interface UseOperationFormToolbarOptions {
  operationType: OperationType;
  isNew?: boolean;
  existing?: Record<string, unknown>;
  usage?: UsedDocumentInfo | null;
  approval?: ApprovalLike | null;
  loading?: boolean;
  userPermissions?: string[];
  saveLabel?: string;
  submitLabel?: string;
  status?: string;
  editableOverride?: boolean;
  whatsappMeta?: WhatsAppFormMeta;
  onSave: (submit: boolean) => Promise<void>;
  onSubmitOnly?: () => Promise<void>;
  onAfterWorkflowAction?: () => void;
}

export function useOperationFormToolbar(options: UseOperationFormToolbarOptions) {
  const {
    operationType,
    isNew,
    existing,
    usage,
    approval,
    loading,
    userPermissions,
    saveLabel,
    submitLabel,
    onSave,
    onSubmitOnly,
    onAfterWorkflowAction,
  } = options;

  const [loadingAction, setLoadingAction] = useState<ToolbarButtonId | null>(null);
  const [canApprove, setCanApprove] = useState(false);

  const status =
    options.status ?? (existing?.status as string | undefined);
  const documentId = existing?.id as string | undefined;

  useEffect(() => {
    if (approval?.id && approval.status === 'Pending') {
      checkCanApprove(approval.id).then(setCanApprove);
    } else {
      setCanApprove(false);
    }
  }, [approval?.id, approval?.status]);

  const toolbar = useOperationToolbar({
    operationType,
    isNew,
    status,
    documentId,
    isUsed: usage?.isUsed,
    usage,
    approvalStatus: approval?.status,
    canApprove,
    loading: loading || loadingAction !== null,
    loadingAction,
    userPermissions,
    saveLabel,
    submitLabel,
    editableOverride: options.editableOverride,
  });

  const handleToolbarAction = useCallback(
    async (id: ToolbarButtonId) => {
      try {
        switch (id) {
          case 'edit':
            toolbar.setEditMode();
            return;
          case 'view':
            toolbar.setViewMode();
            return;
          case 'save':
            setLoadingAction('save');
            await onSave(false);
            return;
          case 'submit':
            if (!(await confirmToolbarAction('submit'))) return;
            setLoadingAction('submit');
            if (!isNew && onSubmitOnly) {
              await onSubmitOnly();
            } else {
              await onSave(true);
            }
            return;
          case 'approve':
            if (!approval?.id) return;
            if (!(await confirmToolbarAction('approve'))) return;
            setLoadingAction('approve');
            await processApproval({ approvalId: approval.id, action: 'approve', notes: '' });
            onAfterWorkflowAction?.();
            return;
          case 'reject': {
            if (!approval?.id) return;
            const notes = prompt('سبب الرفض (مطلوب):');
            if (!notes?.trim()) return;
            if (!(await confirmToolbarAction('reject'))) return;
            setLoadingAction('reject');
            await processApproval({ approvalId: approval.id, action: 'reject', notes: notes.trim() });
            onAfterWorkflowAction?.();
            return;
          }
          default:
            return;
        }
      } finally {
        setLoadingAction(null);
      }
    },
    [approval?.id, isNew, onAfterWorkflowAction, onSave, onSubmitOnly, toolbar]
  );

  const whatsappExtra = useMemo(() => {
    if (isNew || !documentId) return undefined;
    const docNo = String(existing?.documentNo ?? '');
    if (!docNo) return undefined;

    const rawDate = options.whatsappMeta?.documentDate ?? existing?.documentDate;
    const documentDate = rawDate
      ? typeof rawDate === 'string'
        ? formatDate(rawDate)
        : formatDate(String(rawDate))
      : undefined;

    const rawTotal =
      options.whatsappMeta?.total ??
      (existing?.netTotal != null
        ? formatCurrency(Number(existing.netTotal))
        : existing?.totalAmount != null
          ? formatCurrency(Number(existing.totalAmount))
          : existing?.total != null
            ? formatCurrency(Number(existing.total))
            : undefined);

    return createElement(DocumentWhatsAppButton, {
      operationType,
      documentId,
      documentNo: docNo,
      documentDate,
      status,
      total: rawTotal,
      partyName: options.whatsappMeta?.partyName,
      supplierPhone: options.whatsappMeta?.supplierPhone,
      permissions: toolbar.permissions,
      disabled: loading || loadingAction !== null,
    });
  }, [
    isNew,
    documentId,
    existing,
    options.whatsappMeta,
    operationType,
    status,
    toolbar.permissions,
    loading,
    loadingAction,
  ]);

  const toolbarProps: OperationToolbarProps = {
    buttons: toolbar.buttons,
    status,
    usage,
    loadingAction,
    onAction: handleToolbarAction,
    extraActions: whatsappExtra,
  };

  return {
    toolbarProps,
    effectiveEditable: toolbar.effectiveEditable,
    mode: toolbar.mode,
  };
}
