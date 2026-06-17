'use client';

import { useEffect, useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { processApproval, checkCanApprove } from '@/actions/common';

interface ApprovalTimelineProps {
  approval: {
    id: string;
    status: string;
    requestedAt: Date | string;
    requester?: { nameAr: string };
    steps: Array<{
      id: string;
      level: number;
      status: string;
      approverUser?: { nameAr: string } | null;
      actionUser?: { nameAr: string } | null;
      actionAt?: Date | string | null;
      notes?: string | null;
    }>;
    logs: Array<{
      action: string;
      newStatus?: string | null;
      notes?: string | null;
      createdAt: Date | string;
      performer: { nameAr: string };
    }>;
  } | null;
  canApprove?: boolean;
  onAction?: () => void;
}

const STEP_STATUS: Record<string, string> = {
  Pending: 'بانتظار',
  Approved: 'معتمد',
  Rejected: 'مرفوض',
  Returned: 'مرجع',
  Skipped: 'تخطي',
};

export function ApprovalTimeline({ approval, canApprove: canApproveProp, onAction }: ApprovalTimelineProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [canApprove, setCanApprove] = useState(canApproveProp ?? false);

  useEffect(() => {
    if (canApproveProp !== undefined) {
      setCanApprove(canApproveProp);
      return;
    }
    if (approval?.id && approval.status === 'Pending') {
      checkCanApprove(approval.id).then(setCanApprove);
    } else {
      setCanApprove(false);
    }
  }, [approval?.id, approval?.status, canApproveProp]);

  if (!approval) {
    return <div className="text-gray-500 text-sm">لم يتم إرسال المستند للاعتماد بعد</div>;
  }

  const handleAction = async (action: 'approve' | 'reject' | 'return') => {
    if ((action === 'reject' || action === 'return') && !notes.trim()) {
      setPendingAction(action);
      setShowNotes(true);
      return;
    }

    setLoading(true);
    try {
      await processApproval({ approvalId: approval.id, action, notes });
      onAction?.();
      if (canApproveProp === undefined) {
        setCanApprove(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
      setShowNotes(false);
      setNotes('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>مقدم الطلب: {approval.requester?.nameAr}</span>
        <span>•</span>
        <span>الحالة: {approval.status}</span>
      </div>

      <div className="space-y-2">
        {approval.steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step.status === 'Approved' ? 'bg-green-100 text-green-700' :
              step.status === 'Rejected' ? 'bg-red-100 text-red-700' :
              step.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {step.level}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                المستوى {step.level} - {STEP_STATUS[step.status] || step.status}
              </div>
              {step.actionUser && (
                <div className="text-xs text-gray-500">
                  بواسطة: {step.actionUser.nameAr}
                  {step.notes && ` - ${step.notes}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {canApprove && approval.status === 'Pending' && (
        <div className="space-y-3 border-t pt-4">
          {showNotes && (
            <textarea
              className="form-input"
              rows={3}
              placeholder="أدخل الملاحظات أو سبب الرفض..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <button onClick={() => handleAction('approve')} disabled={loading} className="btn-success">
              <Check className="w-4 h-4" /> اعتماد
            </button>
            <button onClick={() => handleAction('reject')} disabled={loading} className="btn-danger">
              <X className="w-4 h-4" /> رفض
            </button>
            <button onClick={() => handleAction('return')} disabled={loading} className="btn-warning">
              <RotateCcw className="w-4 h-4" /> إرجاع للتعديل
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
