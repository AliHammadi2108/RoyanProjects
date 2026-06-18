'use client';

import { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';

export interface ApprovalRecipientOption {
  id: string;
  nameAr: string;
  username: string;
  userNo?: string | null;
}

interface ApprovalRecipientsModalProps {
  candidates: ApprovalRecipientOption[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (recipientUserIds: string[]) => void;
}

export function ApprovalRecipientsModal({
  candidates,
  loading,
  onClose,
  onConfirm,
}: ApprovalRecipientsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map((c) => c.id)));
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size === 0) {
      setError('يجب اختيار معتمد واحد على الأقل');
      return;
    }
    onConfirm(Array.from(selected));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        role="dialog"
        aria-labelledby="approval-recipients-title"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-600" />
            <h2 id="approval-recipients-title" className="font-bold text-gray-900">
              اختيار المعتمدين
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600">
            اختر المستخدمين الذين سيصلهم إشعار طلب الاعتماد. لن يُرسل إشعار إلا للمحددين.
          </p>
          {candidates.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              لم يتم العثور على معتمدين في مصفوفة الاعتماد للمستوى الأول.
            </p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((user) => (
                <li key={user.id}>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selected.has(user.id)}
                      onChange={() => toggle(user.id)}
                      disabled={loading}
                    />
                    <span className="flex-1">
                      <span className="font-medium text-gray-900">{user.nameAr}</span>
                      <span className="block text-xs text-gray-500">
                        {user.userNo ? `${user.userNo} · ` : ''}
                        {user.username}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
          )}
        </div>

        <div className="flex gap-2 justify-end p-4 border-t">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || candidates.length === 0}
            className="btn-primary inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال للاعتماد
          </button>
        </div>
      </div>
    </div>
  );
}
