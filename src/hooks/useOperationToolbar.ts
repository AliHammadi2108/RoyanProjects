'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSessionPermissions } from '@/actions/common';
import {
  computeToolbarButtons,
  isDocumentEditable,
  resolveOperationMode,
  type ComputeToolbarInput,
  type DocumentToolbarState,
  type OperationMode,
  type OperationType,
  type ToolbarButtonId,
  type ToolbarButtonState,
} from '@/lib/operation-toolbar';

export interface UseOperationToolbarOptions extends DocumentToolbarState {
  operationType: OperationType;
  documentId?: string;
  userPermissions?: string[];
  loading?: boolean;
  loadingAction?: ToolbarButtonId | null;
  saveLabel?: string;
  submitLabel?: string;
  status?: string;
  editableOverride?: boolean;
  initialMode?: OperationMode;
}

export interface UseOperationToolbarResult {
  mode: OperationMode;
  effectiveEditable: boolean;
  buttons: ToolbarButtonState[];
  permissions: string[];
  permissionsLoading: boolean;
  setViewMode: () => void;
  setEditMode: () => void;
}

export function useOperationToolbar(options: UseOperationToolbarOptions): UseOperationToolbarResult {
  const {
    operationType,
    isNew,
    status,
    isUsed,
    usage,
    userPermissions: userPermissionsProp,
    loading,
    loadingAction,
    initialMode,
    editableOverride,
  } = options;

  const [permissions, setPermissions] = useState<string[]>(userPermissionsProp ?? []);
  const [permissionsLoading, setPermissionsLoading] = useState(!userPermissionsProp);
  const [forcedMode, setForcedMode] = useState<OperationMode | undefined>(initialMode);

  useEffect(() => {
    if (userPermissionsProp) {
      setPermissions(userPermissionsProp);
      setPermissionsLoading(false);
      return;
    }
    let cancelled = false;
    setPermissionsLoading(true);
    getSessionPermissions()
      .then((perms) => {
        if (!cancelled) setPermissions(perms);
      })
      .finally(() => {
        if (!cancelled) setPermissionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userPermissionsProp]);

  const baseEditable =
    editableOverride ?? isDocumentEditable(status, isUsed || usage?.isUsed);
  const mode = resolveOperationMode(!!isNew, baseEditable, forcedMode);

  const effectiveEditable = isNew || (baseEditable && mode === 'edit');

  const setViewMode = useCallback(() => setForcedMode('view'), []);
  const setEditMode = useCallback(() => {
    if (baseEditable) setForcedMode('edit');
  }, [baseEditable]);

  useEffect(() => {
    if (isNew) setForcedMode(undefined);
  }, [isNew]);

  const computeInput: ComputeToolbarInput = useMemo(
    () => ({
      operationType,
      mode,
      permissions,
      loading: loading || permissionsLoading,
      loadingAction,
      documentId: options.documentId,
      documentEditable: baseEditable,
      status,
      isNew,
      isUsed,
      usage,
      approvalStatus: options.approvalStatus,
      canApprove: options.canApprove,
      saveLabel: options.saveLabel,
      submitLabel: options.submitLabel,
    }),
    [
      operationType,
      mode,
      permissions,
      loading,
      permissionsLoading,
      loadingAction,
      options.documentId,
      baseEditable,
      status,
      isNew,
      isUsed,
      usage,
      options.approvalStatus,
      options.canApprove,
      options.saveLabel,
      options.submitLabel,
    ]
  );

  const buttons = useMemo(() => computeToolbarButtons(computeInput), [computeInput]);

  return {
    mode,
    effectiveEditable,
    buttons,
    permissions,
    permissionsLoading,
    setViewMode,
    setEditMode,
  };
}
