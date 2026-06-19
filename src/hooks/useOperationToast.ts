'use client';

import { useToast } from '@/contexts/ToastContext';
import { OPERATION_MESSAGES, type OperationMessageKey } from '@/lib/operation-messages';

export function useOperationToast() {
  const { showSuccess, showOperationSuccess } = useToast();

  return {
    showSuccess,
    showOperationSuccess,
    showSaveSuccess: (isNew?: boolean) =>
      showSuccess(isNew ? OPERATION_MESSAGES.save : OPERATION_MESSAGES.update),
    showSubmitSuccess: () => showOperationSuccess('submit'),
    showApproveSuccess: () => showOperationSuccess('approve'),
    showRejectSuccess: () => showOperationSuccess('reject'),
    showDeleteSuccess: () => showOperationSuccess('delete'),
  };
}
