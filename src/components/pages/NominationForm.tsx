'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { OperationToolbar } from '@/components/ui/OperationToolbar';
import { createNomination, updateNomination, submitNomination, deleteNomination } from '@/actions/comparisons';
import { fetchDocumentUsage, getDocumentApproval } from '@/actions/common';
import { formatCurrency } from '@/lib/utils';
import { resolveSourceDocument } from '@/lib/document-cascade';
import { DocumentFormFooter, EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';
import { useOperationFormToolbar } from '@/hooks/useOperationFormToolbar';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';

interface ApprovedComparison {
  id: string;
  documentNo: string;
  branchId: string;
  purchaseCycleId: string;
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    unitId?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    quantity: number;
    unitPrice: number;
    netAmount: number;
    isSelected: boolean;
    quotationId?: string | null;
    quotationNo?: string | null;
  }>;
}

interface NominationFormProps {
  approvedComparisons: ApprovedComparison[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultComparisonId?: string;
}

export function NominationForm({
  approvedComparisons,
  existing,
  isNew,
  defaultComparisonId,
}: NominationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approval, setApproval] = useState<Parameters<typeof ApprovalTimeline>[0]['approval']>(null);
  const [usage, setUsage] = useState<UsedDocumentInfo | null>(null);

  const defaultComparison = resolveSourceDocument(approvedComparisons, defaultComparisonId);

  const [form, setForm] = useState({
    technicalComparisonId: (existing?.technicalComparisonId as string) || defaultComparison?.id || '',
    branchId: (existing?.branchId as string) || defaultComparison?.branchId || '',
    supplierId: (existing?.supplierId as string) || '',
    comparisonType: (existing?.comparisonType as string) || 'LOWEST_PRICE',
    committeeMembers: (existing?.committeeMembers as string) || '',
    notes: (existing?.notes as string) || '',
    items: ((existing?.items as Array<Record<string, unknown>>) ||
      defaultComparison?.items.filter((i) => i.isSelected) ||
      defaultComparison?.items ||
      []
    ).map((i) => ({
      itemId: i.itemId as string,
      itemNameSnapshot: i.itemNameSnapshot as string,
      quantity: i.quantity as number,
      unitPrice: i.unitPrice as number,
      supplierId: (i.supplierId as string) || '',
      supplierName: (i.supplierName as string) || '',
      quotationId: (i.quotationId as string) || '',
      isApproved: true,
    })),
  });

  const isEditable = isNew || EDITABLE_DOC_STATUSES.includes(existing?.status as string);

  useEffect(() => {
    if (existing?.id) {
      getDocumentApproval('SUPPLIER_NOMINATION', existing.id as string).then(setApproval);
      fetchDocumentUsage('SUPPLIER_NOMINATION', existing.id as string).then(setUsage);
    }
  }, [existing?.id]);

  const handleComparisonChange = (comparisonId: string) => {
    const comparison = approvedComparisons.find((c) => c.id === comparisonId);
    if (!comparison) return;
    const selectedItems = comparison.items.filter((i) => i.isSelected);
    const items = (selectedItems.length > 0 ? selectedItems : comparison.items).map((i) => ({
      itemId: i.itemId,
      itemNameSnapshot: i.itemNameSnapshot,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      supplierId: i.supplierId || '',
      supplierName: i.supplierName || '',
      quotationId: i.quotationId || '',
      isApproved: true,
    }));
    setForm({
      ...form,
      technicalComparisonId: comparisonId,
      branchId: comparison.branchId,
      supplierId: items[0]?.supplierId || '',
      items,
    });
  };

  const handleSave = async (submit = false, recipientUserIds?: string[]) => {
    setLoading(true);
    setError('');
    if (!form.items.length) {
      setError('يجب اختيار أصناف للترشيح');
      setLoading(false);
      return;
    }
    try {
      let result;
      if (isNew) {
        result = await createNomination(form);
      } else {
        result = await updateNomination(existing!.id as string, form);
      }
      if (submit && result) {
        await submitNomination(result.id, recipientUserIds);
      }
      router.push(`/purchases/supplier-selection/${result?.id || existing?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف الترشيح ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deleteNomination(existing.id as string);
      router.push('/purchases/supplier-selection');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  const handleSubmitOnly = async (recipientUserIds?: string[]) => {
    if (!existing?.id) return;
    setLoading(true);
    try {
      await submitNomination(existing.id as string, recipientUserIds);
      getDocumentApproval('SUPPLIER_NOMINATION', existing.id as string).then(setApproval);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
    }
  };

  const total = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const refreshApproval = () => {
    if (!existing?.id) return;
    getDocumentApproval('SUPPLIER_NOMINATION', existing.id as string).then(setApproval);
    router.refresh();
  };

  const { toolbarProps, effectiveEditable, recipientModal } = useOperationFormToolbar({
    operationType: 'nomination',
    isNew,
    existing,
    usage,
    approval,
    loading,
    approvalContext: {
      branchId: form.branchId,
      totalAmount: total,
    },
    onSave: handleSave,
    onSubmitOnly: handleSubmitOnly,
    onAfterWorkflowAction: refreshApproval,
  });

  return (
    <>
      <Header
        title={isNew ? 'ترشيح مورد جديد' : `ترشيح مورد ${existing?.documentNo}`}
        subtitle="APST004"
      />
      <PageContainer>
        <OperationToolbar {...toolbarProps} />
        {recipientModal}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="font-semibold mb-4">البيانات الرئيسية</h2>
              {isNew && (
                <div className="mb-4">
                  <label className="form-label">المقارنة الفنية *</label>
                  <select
                    className="form-input"
                    value={form.technicalComparisonId}
                    onChange={(e) => handleComparisonChange(e.target.value)}
                  >
                    {approvedComparisons.map((c) => (
                      <option key={c.id} value={c.id}>{c.documentNo}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">نوع المقارنة</label>
                  <select
                    className="form-input"
                    value={form.comparisonType}
                    disabled={!effectiveEditable}
                    onChange={(e) => setForm({ ...form, comparisonType: e.target.value })}
                  >
                    <option value="LOWEST_PRICE">أقل سعر</option>
                    <option value="BEST_VALUE">أفضل قيمة</option>
                    <option value="COMMITTEE">لجنة</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">أعضاء اللجنة</label>
                  <input
                    className="form-input"
                    value={form.committeeMembers}
                    disabled={!effectiveEditable}
                    onChange={(e) => setForm({ ...form, committeeMembers: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">الملاحظات</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.notes}
                    disabled={!effectiveEditable}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">الأصناف المرشحة</h2>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right">الصنف</th>
                    <th className="px-3 py-2 text-right">المورد</th>
                    <th className="px-3 py-2 text-right">الكمية</th>
                    <th className="px-3 py-2 text-right">السعر</th>
                    <th className="px-3 py-2 text-right">الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{item.itemNameSnapshot}</td>
                      <td className="px-3 py-2">{item.supplierName}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-left font-bold">الإجمالي: {formatCurrency(total)}</div>
            </div>

            <DocumentFormFooter
              listHref="/purchases/supplier-selection"
              isEditable={false}
              isNew={isNew}
              canDelete={existing?.status === 'Draft'}
              loading={loading}
              status={existing?.status as string}
              hideActions
              hideReadOnlyMessage
              onDelete={handleDelete}
              showSubmit={false}
            />

            {existing?.status === 'Approved' && (
              <div className="card bg-green-50 border-green-200">
                <p className="text-green-800 text-sm">
                  الترشيح معتمد. يمكن إنشاء{' '}
                  <a href={`/purchases/orders/new?nominationId=${existing.id}`} className="font-bold underline">
                    أمر شراء
                  </a>
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">مسار الاعتماد</h2>
            <ApprovalTimeline
              approval={approval}
              onAction={refreshApproval}
            />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
