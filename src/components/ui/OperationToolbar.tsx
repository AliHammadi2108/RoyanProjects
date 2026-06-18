'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { UsedDocumentBadge, type UsedDocumentInfo } from './UsedDocumentBadge';
import { isDocumentLocked } from '@/lib/operation-toolbar';
import type { ToolbarButtonId, ToolbarButtonState } from '@/lib/operation-toolbar';

function LockedDocumentBadge() {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-100 text-amber-800 border-amber-200"
      title="المستند مقفل ولا يمكن تعديله"
    >
      مقفلة
    </span>
  );
}

function ApprovedDocumentBadge() {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200"
      title="المستند معتمد"
    >
      معتمدة
    </span>
  );
}

interface DocumentStateBadgesProps {
  status?: string;
  usage?: UsedDocumentInfo | null;
  showApproved?: boolean;
  hideStatus?: boolean;
}

export function DocumentStateBadges({
  status,
  usage,
  showApproved = true,
  hideStatus = false,
}: DocumentStateBadgesProps) {
  const locked = isDocumentLocked(status);
  const approved = status === 'Approved';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!hideStatus && status ? <StatusBadge status={status} /> : null}
      {!hideStatus && showApproved && approved ? <ApprovedDocumentBadge /> : null}
      {!hideStatus && locked && !approved ? <LockedDocumentBadge /> : null}
      <UsedDocumentBadge usage={usage} />
    </div>
  );
}

const VARIANT_CLASSES: Record<ToolbarButtonState['variant'], string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium disabled:opacity-50',
  danger: 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-sm disabled:opacity-50',
};

export interface OperationToolbarProps {
  buttons: ToolbarButtonState[];
  status?: string;
  usage?: UsedDocumentInfo | null;
  hideStatus?: boolean;
  loadingAction?: ToolbarButtonId | null;
  onAction?: (id: ToolbarButtonId) => void;
  extraActions?: ReactNode;
  className?: string;
}

export function OperationToolbar({
  buttons,
  status,
  usage,
  hideStatus,
  loadingAction,
  onAction,
  extraActions,
  className,
}: OperationToolbarProps) {
  const renderButton = (button: ToolbarButtonState) => {
    const isLoading = loadingAction === button.id;
    const className = cn(VARIANT_CLASSES[button.variant], 'text-sm');

    const content = (
      <>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {button.label}
      </>
    );

    if (button.href && !button.disabled) {
      return (
        <Link
          key={button.id}
          href={button.href}
          target={button.target}
          className={className}
          title={button.tooltip}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={button.id}
        type="button"
        className={className}
        disabled={button.disabled || isLoading}
        title={button.tooltip}
        onClick={() => onAction?.(button.id)}
      >
        {content}
      </button>
    );
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-20 -mx-6 px-6 py-3 mb-4 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DocumentStateBadges status={status} usage={usage} hideStatus={hideStatus} />
        <div className="flex flex-wrap items-center gap-2">
          {buttons.map(renderButton)}
          {extraActions}
        </div>
      </div>
    </div>
  );
}

export function confirmToolbarAction(
  id: ToolbarButtonId,
  labels?: Partial<Record<ToolbarButtonId, string>>
): boolean {
  const messages: Partial<Record<ToolbarButtonId, string>> = {
    submit: 'هل تريد إرسال المستند للاعتماد؟',
    approve: 'هل تريد اعتماد هذا المستند؟',
    reject: 'هل تريد رفض هذا المستند؟',
    ...labels,
  };
  const message = messages[id];
  if (!message) return true;
  return confirm(message);
}
