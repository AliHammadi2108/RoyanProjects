'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { PrintDocumentData } from '@/lib/print-types';
import { formatNumber } from '@/lib/utils';

interface OperationPrintViewProps {
  data: PrintDocumentData;
  listHref: string;
  listLabel: string;
}

export function OperationPrintView({ data, listHref, listLabel }: OperationPrintViewProps) {
  useEffect(() => {
    document.title = `طباعة - ${data.documentNo}`;
  }, [data.documentNo]);

  const showPricing = data.showLinePricing !== false;

  return (
    <>
      <Header
        title="معاينة الطباعة"
        subtitle={data.title}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <a href={listHref} className="btn-secondary text-sm">
              {listLabel}
            </a>
            <button type="button" onClick={() => window.print()} className="btn-primary text-sm">
              <Printer className="w-4 h-4" /> طباعة
            </button>
          </div>
        }
      />
      <PageContainer>
        <div id="operation-print-area" className="card max-w-5xl mx-auto print:shadow-none print:border-0 print:max-w-none">
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">{data.title}</h1>
            <p className="text-lg font-semibold text-primary-700 mt-1">{data.documentNo}</p>
            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              <span className="text-sm text-gray-600">التاريخ: {data.documentDate}</span>
              <StatusBadge status={data.status} />
              {data.approvalStatus && data.approvalStatus !== 'None' && (
                <span className="text-sm text-gray-600">الاعتماد: {data.approvalStatus}</span>
              )}
            </div>
          </div>

          {data.statusBanner && (
            <div className="mb-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center font-medium">
              {data.statusBanner}
            </div>
          )}

          {data.fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6 text-sm">
              {data.fields.map((f) => (
                <div key={f.label} className="flex gap-2">
                  <span className="text-gray-500 shrink-0">{f.label}:</span>
                  <span className="font-medium text-gray-900 break-words">{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {data.lines.length > 0 && (
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full text-sm border border-gray-200 print:text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-10">#</th>
                    <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-24">الكود</th>
                    <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 min-w-[200px]">الصنف</th>
                    <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 min-w-[120px]">الوحدة</th>
                    <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-20">الكمية</th>
                    {showPricing && (
                      <>
                        <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-20">أساسية</th>
                        <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-24">السعر</th>
                        <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-20">خصم</th>
                        <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-20">ضريبة</th>
                        <th className="px-2 py-2 text-right border-b font-semibold text-gray-700 w-24">الإجمالي</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-right border-b font-semibold text-gray-700">البيان</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-2 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-2 py-2 font-mono text-xs">{line.itemCode || '-'}</td>
                      <td className="px-2 py-2 font-medium whitespace-normal break-words">{line.itemName}</td>
                      <td
                        className="px-2 py-2 whitespace-normal break-words"
                        title={line.unit || undefined}
                      >
                        {line.unit || '-'}
                      </td>
                      <td className="px-2 py-2">{formatNumber(line.quantity)}</td>
                      {showPricing && (
                        <>
                          <td className="px-2 py-2 text-gray-600">
                            {line.baseQty != null ? line.baseQty.toFixed(2) : '-'}
                          </td>
                          <td className="px-2 py-2">{(line.unitPrice ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-2">{(line.discount ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-2">{(line.tax ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-2 font-medium">{(line.total ?? 0).toFixed(2)}</td>
                        </>
                      )}
                      <td className="px-2 py-2 text-gray-600 whitespace-normal break-words">{line.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.totals.length > 0 && (
            <div className="flex justify-end mb-6">
              <div className="w-full sm:w-72 space-y-1 text-sm">
                {data.totals.map((t) => (
                  <div key={t.label} className="flex justify-between gap-4 border-b border-gray-100 py-1">
                    <span className="text-gray-600">{t.label}</span>
                    <span className="font-bold">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.approval && (
            <div className="border-t border-gray-200 pt-4 mb-4 text-sm">
              <h3 className="font-semibold mb-2">بيانات الاعتماد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="text-gray-500">الحالة: </span>{data.approval.status}</div>
                {data.approval.requestedBy && (
                  <div><span className="text-gray-500">مقدم الطلب: </span>{data.approval.requestedBy}</div>
                )}
                {data.approval.approvedBy && (
                  <div><span className="text-gray-500">المعتمد: </span>{data.approval.approvedBy}</div>
                )}
                {data.approval.approvalDate && (
                  <div><span className="text-gray-500">تاريخ الاعتماد: </span>{data.approval.approvalDate}</div>
                )}
              </div>
            </div>
          )}

          {data.notes && (
            <div className="border-t border-gray-200 pt-4 mb-4 text-sm">
              <h3 className="font-semibold mb-1">ملاحظات</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 mt-6 grid grid-cols-3 gap-4 text-sm text-center print:mt-12">
            <div>
              <p className="text-gray-500 mb-8">مقدم الطلب</p>
              <div className="border-t border-gray-400 pt-1">{data.approval?.requestedBy || '................'}</div>
            </div>
            <div>
              <p className="text-gray-500 mb-8">المعتمد</p>
              <div className="border-t border-gray-400 pt-1">{data.approval?.approvedBy || '................'}</div>
            </div>
            <div>
              <p className="text-gray-500 mb-8">المدير المالي</p>
              <div className="border-t border-gray-400 pt-1">................</div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
