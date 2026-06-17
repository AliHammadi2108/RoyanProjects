'use client';

import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { DOCUMENT_LABELS_AR } from '@/lib/constants';

export interface UsedDocumentInfo {
  isUsed: boolean;
  label?: string;
  childType?: string;
  childId?: string;
  childNo?: string;
  childRoute?: string;
}

function usageTooltip(usage: UsedDocumentInfo): string {
  if (usage.childNo && usage.childType) {
    const docLabel = DOCUMENT_LABELS_AR[usage.childType] || usage.childType;
    return `تم التحويل إلى ${docLabel}: ${usage.childNo}`;
  }
  return usage.label || 'مستخدم';
}

interface UsedDocumentBadgeProps {
  usage?: UsedDocumentInfo | null;
  compact?: boolean;
}

export function UsedDocumentBadge({ usage, compact }: UsedDocumentBadgeProps) {
  if (!usage?.isUsed) return null;

  const tooltip = usageTooltip(usage);

  const badge = (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
      title={tooltip}
    >
      <Link2 className="w-3 h-3" />
      {compact ? 'مستخدم' : usage.label || 'مستخدم'}
    </span>
  );

  if (usage.childRoute && usage.childId) {
    return (
      <Link href={usage.childRoute} className="hover:opacity-80" title={tooltip}>
        {badge}
      </Link>
    );
  }

  return badge;
}

export function UsedFilterSelect({
  value,
  onChange,
}: {
  value: '' | 'unused' | 'used';
  onChange: (v: '' | 'unused' | 'used') => void;
}) {
  return (
    <select
      className="form-input text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as '' | 'unused' | 'used')}
      aria-label="تصفية حسب الاستخدام"
    >
      <option value="">الكل</option>
      <option value="unused">غير مستخدم</option>
      <option value="used">مستخدم</option>
    </select>
  );
}

export function getChildDocLabel(childType?: string) {
  return childType ? DOCUMENT_LABELS_AR[childType] || childType : '';
}
