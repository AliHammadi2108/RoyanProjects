'use client';

import { useMemo } from 'react';
import { WhatsAppShareButton } from '@/components/ui/WhatsAppShareButton';
import {
  buildAbsoluteUrl,
  formatDocumentMessage,
  getDocumentPrintPath,
  getDocumentTypeLabelAr,
  getDocumentViewPath,
} from '@/lib/whatsapp';
import { canWhatsApp, hasClientPermission } from '@/lib/operation-toolbar';
import type { OperationType } from '@/lib/operation-toolbar';

export interface DocumentWhatsAppButtonProps {
  operationType: OperationType;
  documentId: string;
  documentNo: string;
  documentDate?: string;
  status?: string;
  total?: string;
  partyName?: string;
  supplierPhone?: string | null;
  permissions: string[];
  disabled?: boolean;
}

export function DocumentWhatsAppButton({
  operationType,
  documentId,
  documentNo,
  documentDate,
  status,
  total,
  partyName,
  supplierPhone,
  permissions,
  disabled,
}: DocumentWhatsAppButtonProps) {
  const canSend = canWhatsApp(permissions);
  const noPermission = 'ليس لديك صلاحية إرسال واتساب';

  const message = useMemo(() => {
    const viewPath = getDocumentViewPath(operationType, documentId);
    const printPath = getDocumentPrintPath(operationType, documentId);
    return formatDocumentMessage({
      docTypeLabel: getDocumentTypeLabelAr(operationType),
      documentNo,
      documentDate,
      status,
      total,
      partyName,
      documentUrl: buildAbsoluteUrl(viewPath),
      printUrl: buildAbsoluteUrl(printPath),
    });
  }, [
    operationType,
    documentId,
    documentNo,
    documentDate,
    status,
    total,
    partyName,
  ]);

  if (!documentId || !documentNo) return null;

  return (
    <WhatsAppShareButton
      message={message}
      defaultPhone={supplierPhone}
      disabled={disabled || !canSend}
      disabledReason={!canSend ? noPermission : undefined}
      label="إرسال واتساب"
    />
  );
}

export function canUserWhatsApp(permissions: string[], permissionPrefix?: string): boolean {
  if (hasClientPermission(permissions, 'admin')) return true;
  if (hasClientPermission(permissions, 'whatsapp.send')) return true;
  if (permissionPrefix && canWhatsApp(permissions, permissionPrefix)) return true;
  return (
    hasClientPermission(permissions, 'operations.print') ||
    hasClientPermission(permissions, 'reports.export')
  );
}
