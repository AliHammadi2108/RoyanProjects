'use client';

import Link from 'next/link';
import { ArrowRight, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DocumentFormActionsProps {
  listHref: string;
  listLabel?: string;
  status?: string;
  isEditable: boolean;
  isNew?: boolean;
  canDelete?: boolean;
  loading?: boolean;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  submitLabel?: string;
  showSubmit?: boolean;
  extraReadOnlyMessage?: string;
}

export function DocumentFormHeader({
  listHref,
  listLabel = 'قائمة العمليات',
  status,
}: Pick<DocumentFormActionsProps, 'listHref' | 'listLabel' | 'status'>) {
  return (
    <div className="flex items-center gap-2">
      <Link href={listHref} className="btn-secondary text-sm">
        <ArrowRight className="w-4 h-4" /> {listLabel}
      </Link>
      {status ? <StatusBadge status={status} /> : null}
    </div>
  );
}

export function DocumentFormFooter({
  listHref,
  isEditable,
  isNew,
  canDelete,
  loading,
  onSaveDraft,
  onSubmit,
  onDelete,
  saveLabel = 'حفظ',
  submitLabel = 'إرسال للاعتماد',
  showSubmit = true,
  extraReadOnlyMessage,
  status,
}: DocumentFormActionsProps) {
  return (
    <>
      {isEditable && (onSaveDraft || onSubmit) && (
        <div className="flex gap-3 flex-wrap">
          {onSaveDraft && (
            <button type="button" onClick={onSaveDraft} disabled={loading} className="btn-secondary">
              {saveLabel}
            </button>
          )}
          {showSubmit && onSubmit && (
            <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
              {submitLabel}
            </button>
          )}
          {!isNew && canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-sm"
            >
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          )}
        </div>
      )}

      {!isEditable && !isNew && (
        <div className="card bg-gray-50 border-gray-200">
          <p className="text-sm text-gray-600">
            {extraReadOnlyMessage || (
              <>
                هذا المستند في حالة <strong>{status}</strong> ولا يمكن تعديله.
                ارجع إلى{' '}
                <Link href={listHref} className="text-primary-600 font-medium underline">
                  قائمة العمليات
                </Link>{' '}
                لاستعراض جميع السجلات المحفوظة.
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}

export const EDITABLE_DOC_STATUSES = ['Draft', 'Returned For Edit'];
