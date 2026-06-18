'use client';

import { useCallback, useEffect, useMemo, useState, createElement } from 'react';
import { checkCanApprove, fetchApprovalRecipients, processApproval } from '@/actions/common';
import { ApprovalRecipientsModal } from '@/components/ui/ApprovalRecipientsModal';
import { confirmToolbarAction, type OperationToolbarProps } from '@/components/ui/OperationToolbar';
import { DocumentWhatsAppButton } from '@/components/ui/DocumentWhatsAppButton';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';
import { useOperationToolbar } from '@/hooks/useOperationToolbar';
import { OPERATION_TO_DOCUMENT_TYPE } from '@/lib/constants';
import type { OperationType, ToolbarButtonId } from '@/lib/operation-toolbar';
import { formatDate, type CurrencyLike } from '@/lib/utils';
import { formatWhatsAppDocumentTotal } from '@/lib/whatsapp';
import { getStatusLabel } from '@/lib/status-labels';

interface ApprovalLike {
  id: string;
  status: string;
}

export interface WhatsAppFormMeta {
  totalAmount?: number;
  currency?: CurrencyLike;
  supplierPhone?: string | null;
  partyName?: string;
  documentDate?: string;
}

export interface ApprovalSubmitContext {
  branchId?: string;
  departmentId?: string;
  totalAmount?: number;
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
  approvalContext?: ApprovalSubmitContext;
  onSave: (submit: boolean, recipientUserIds?: string[]) => Promise<void>;
  onSubmitOnly?: (recipientUserIds?: string[]) => Promise<void>;
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
    approvalContext,
  } = options;

  const [loadingAction, setLoadingAction] = useState<ToolbarButtonId | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [recipientCandidates, setRecipientCandidates] = useState<
    Array<{ id: string; nameAr: string; username: string; userNo?: string | null }>
  >([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [pendingSubmitMode, setPendingSubmitMode] = useState<'saveAndSubmit' | 'submitOnly'>('submitOnly');

  const status =
    options.status ?? (existing?.status as string | undefined);
  const documentId = existing?.id as string | undefined;
  const documentType = OPERATION_TO_DOCUMENT_TYPE[operationType];

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
    loading: loading || loadingAction !== null || loadingRecipients,
    loadingAction,
    userPermissions,
    saveLabel,
    submitLabel,
    editableOverride: options.editableOverride,
  });

  const resolveApprovalContext = useCallback((): ApprovalSubmitContext => {
    if (approvalContext) return approvalContext;
    return {
      branchId: (existing?.branchId as string) || undefined,
      departmentId: (existing?.departmentId as string) || undefined,
      totalAmount:
        (existing?.totalAmount as number) ||
        (existing?.total as number) ||
        (existing?.netTotal as number) ||
        undefined,
    };
  }, [approvalContext, existing]);

  const runSubmit = useCallback(
    async (recipientUserIds: string[]) => {
      setLoadingAction('submit');
      try {
        if (pendingSubmitMode === 'submitOnly' && onSubmitOnly) {
          await onSubmitOnly(recipientUserIds);
        } else {
          await onSave(true, recipientUserIds);
        }
      } catch {
        setLoadingAction(null);
      }
    },
    [onSave, onSubmitOnly, pendingSubmitMode]
  );

  const openRecipientModal = useCallback(
    async (mode: 'saveAndSubmit' | 'submitOnly') => {
      if (!documentType) {
        await runSubmit([]);
        return;
      }

      setPendingSubmitMode(mode);
      setLoadingRecipients(true);
      try {
        const ctx = resolveApprovalContext();
        const candidates = await fetchApprovalRecipients({
          documentType,
          branchId: ctx.branchId,
          departmentId: ctx.departmentId,
          totalAmount: ctx.totalAmount,
        });
        if (candidates.length === 0) {
          throw new Error('لم يتم العثور على معتمدين في مصفوفة الاعتماد');
        }
        if (candidates.length === 1) {
          await runSubmit([candidates[0].id]);
          return;
        }
        setRecipientCandidates(candidates);
        setRecipientModalOpen(true);
      } catch {
        setLoadingRecipients(false);
        throw new Error('تعذر تحميل قائمة المعتمدين');
      } finally {
        setLoadingRecipients(false);
      }
    },
    [documentType, resolveApprovalContext, runSubmit]
  );

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
            try {
              await onSave(false);
            } catch {
              setLoadingAction(null);
            }
            return;
          case 'submit':
            if (!(await confirmToolbarAction('submit'))) return;
            if (!isNew && onSubmitOnly) {
              await openRecipientModal('submitOnly');
            } else {
              await openRecipientModal('saveAndSubmit');
            }
            return;
          case 'approve':
            if (!approval?.id) return;
            if (!(await confirmToolbarAction('approve'))) return;
            setLoadingAction('approve');
            try {
              await processApproval({ approvalId: approval.id, action: 'approve', notes: '' });
              onAfterWorkflowAction?.();
            } catch {
              setLoadingAction(null);
            }
            return;
          case 'reject': {
            if (!approval?.id) return;
            const notes = prompt('سبب الرفض (مطلوب):');
            if (!notes?.trim()) return;
            if (!(await confirmToolbarAction('reject'))) return;
            setLoadingAction('reject');
            try {
              await processApproval({ approvalId: approval.id, action: 'reject', notes: notes.trim() });
              onAfterWorkflowAction?.();
            } catch {
              setLoadingAction(null);
            }
            return;
          }
          default:
            return;
        }
      } catch {
        setLoadingAction(null);
      }
    },
    [approval?.id, isNew, onAfterWorkflowAction, onSave, onSubmitOnly, openRecipientModal, toolbar]
  );

  const recipientModal = recipientModalOpen ? (
    <ApprovalRecipientsModal
      candidates={recipientCandidates}
      loading={loadingAction === 'submit'}
      onClose={() => {
        if (loadingAction !== 'submit') {
          setRecipientModalOpen(false);
          setRecipientCandidates([]);
        }
      }}
      onConfirm={async (recipientUserIds) => {
        try {
          await runSubmit(recipientUserIds);
          setRecipientModalOpen(false);
          setRecipientCandidates([]);
        } catch {
          // keep modal open; loading reset in runSubmit
        }
      }}
    />
  ) : null;

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

    const rawTotal = formatWhatsAppDocumentTotal(existing, {
      totalAmount: options.whatsappMeta?.totalAmount,
      currency: options.whatsappMeta?.currency,
    });

    const statusLabel = getStatusLabel(status);

    return createElement(DocumentWhatsAppButton, {
      operationType,
      documentId,
      documentNo: docNo,
      documentDate,
      status: statusLabel,
      total: rawTotal,
      partyName: options.whatsappMeta?.partyName,
      supplierPhone: options.whatsappMeta?.supplierPhone,
      permissions: toolbar.permissions,
      disabled: loading || loadingAction !== null || loadingRecipients,
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
    loadingRecipients,
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
    recipientModal,
  };
}
