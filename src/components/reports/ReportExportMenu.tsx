'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Printer,
} from 'lucide-react';
import {
  exportReportTable,
  type ExportSummaryItem,
  type ReportExportFormat,
} from '@/lib/export';
import { formatReportMessage, resolveDefaultWhatsAppPhone } from '@/lib/whatsapp';
import { WhatsAppShareButton } from '@/components/ui/WhatsAppShareButton';

interface ReportExportMenuProps {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  summary?: ExportSummaryItem[];
  canExport?: boolean;
  canPrint?: boolean;
  canWhatsApp?: boolean;
}

const EXPORT_OPTIONS: {
  format: ReportExportFormat;
  label: string;
  icon: typeof FileSpreadsheet;
}[] = [
  { format: 'pdf', label: 'تصدير PDF', icon: FileText },
  { format: 'excel', label: 'تصدير Excel', icon: FileSpreadsheet },
  { format: 'word', label: 'تصدير Word', icon: FileType },
  { format: 'csv', label: 'تصدير CSV', icon: Download },
];

export function ReportExportMenu({
  filename,
  title,
  subtitle,
  columns,
  rows,
  summary,
  canExport = true,
  canPrint = true,
  canWhatsApp = true,
}: ReportExportMenuProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!canExport && !canPrint && !canWhatsApp) return null;

  const userPhone = (session?.user as { phone?: string } | undefined)?.phone;
  const defaultPhone = resolveDefaultWhatsAppPhone(null, userPhone);

  const whatsappMessage = formatReportMessage({
    reportTitle: title || filename,
    subtitle,
    summaryLines: summary?.map((s) => `${s.label}: ${s.value}`),
    rowCount: rows.length,
    attachNote:
      rows.length > 0
        ? 'لإرفاق التقرير الكامل: صدّر PDF/Excel ثم أرفق الملف يدوياً في واتساب'
        : undefined,
  });

  const handleExport = (format: ReportExportFormat) => {
    setOpen(false);
    startTransition(async () => {
      await exportReportTable(format, {
        filename,
        title,
        subtitle,
        columns,
        rows,
        summary,
      });
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      {canExport ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            disabled={isPending || rows.length === 0}
            className="btn-secondary text-sm inline-flex items-center gap-1.5"
            title={rows.length === 0 ? 'لا توجد بيانات للتصدير' : undefined}
          >
            <Download className="w-4 h-4" />
            تصدير
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open ? (
            <div className="absolute left-0 z-30 mt-1 min-w-[180px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {EXPORT_OPTIONS.map(({ format, label, icon: Icon }) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(format)}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {canWhatsApp ? (
        <WhatsAppShareButton
          message={whatsappMessage}
          defaultPhone={defaultPhone}
          label="واتساب"
          disabled={rows.length === 0}
          disabledReason="لا توجد بيانات للإرسال"
          attachNote={
            typeof navigator !== 'undefined' && 'share' in navigator
              ? 'يمكنك أيضاً مشاركة الملف المُصدَّر عبر زر المشاركة على الجوال'
              : undefined
          }
        />
      ) : null}

      {canPrint ? (
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary text-sm inline-flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      ) : null}
    </div>
  );
}
