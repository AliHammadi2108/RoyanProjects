'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { OperationToolbar } from '@/components/ui/OperationToolbar';
import { createComparison, updateComparison, submitComparison, deleteComparison } from '@/actions/comparisons';
import { getApprovedQuotationsForRequest } from '@/actions/quotations';
import { fetchDocumentUsage, getDocumentApproval } from '@/actions/common';
import { DocumentFormFooter, EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';
import { useOperationFormToolbar } from '@/hooks/useOperationFormToolbar';
import { useOperationToast } from '@/hooks/useOperationToast';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';
import { formatCurrency } from '@/lib/utils';
import { normalizePaymentMethod } from '@/lib/constants';
import { PaymentMethodSelect } from '@/components/ui/PaymentMethodSelect';
import { resolveSourceDocument, isCascadeLockActive, masterFieldDisabled } from '@/lib/document-cascade';
import { MasterDataSelect } from '@/components/ui/MasterDataSelect';
import type { MasterData } from '@/types/master-data';

interface ApprovedRequest {
  id: string;
  documentNo: string;
  branchId: string;
  purchaseCycleId: string;
  currencyId?: string | null;
}

interface QuotationOption {
  id: string;
  documentNo: string;
  supplierId: string;
  supplier: { nameAr: string };
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    unitId?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface ComparisonFormProps {
  masterData: MasterData;
  approvedRequests: ApprovedRequest[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultRequestId?: string;
  defaultQuotationIds?: string[];
}

export function ComparisonForm({
  masterData,
  approvedRequests,
  existing,
  isNew,
  defaultRequestId,
  defaultQuotationIds = [],
}: ComparisonFormProps) {
  const router = useRouter();
  const { showDeleteSuccess } = useOperationToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approval, setApproval] = useState<Parameters<typeof ApprovalTimeline>[0]['approval']>(null);
  const [usage, setUsage] = useState<UsedDocumentInfo | null>(null);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<string[]>(
    existing?.quotationIds ? (existing.quotationIds as string).split(',').filter(Boolean) : []
  );

  const defaultRequest = resolveSourceDocument(approvedRequests, defaultRequestId);

  const [form, setForm] = useState({
    purchaseCycleId: (existing?.purchaseCycleId as string) || defaultRequest?.purchaseCycleId || '',
    branchId: (existing?.branchId as string) || defaultRequest?.branchId || masterData.branches[0]?.id || '',
    purchaseRequestId: defaultRequest?.id || '',
    currencyId: (existing?.currencyId as string) || defaultRequest?.currencyId || masterData.currencies[0]?.id || '',
    paymentMethod: normalizePaymentMethod(existing?.paymentMethod as string),
    notes: (existing?.notes as string) || '',
    items: ((existing?.items as Array<Record<string, unknown>>) || []).map((i) => ({
      itemId: i.itemId as string,
      itemNameSnapshot: i.itemNameSnapshot as string,
      unitId: (i.unitId as string) || '',
      supplierId: (i.supplierId as string) || '',
      supplierName: (i.supplierName as string) || '',
      quantity: i.quantity as number,
      unitPrice: i.unitPrice as number,
      netAmount: i.netAmount as number,
      isSelected: i.isSelected as boolean,
      quotationId: (i.quotationId as string) || '',
      quotationNo: (i.quotationNo as string) || '',
      notes: (i.notes as string) || '',
    })),
  });

  const isEditable = isNew || EDITABLE_DOC_STATUSES.includes(existing?.status as string);

  useEffect(() => {
    if (existing?.id) {
      getDocumentApproval('TECHNICAL_COMPARISON', existing.id as string).then(setApproval);
      fetchDocumentUsage('TECHNICAL_COMPARISON', existing.id as string).then(setUsage);
    }
  }, [existing?.id]);

  useEffect(() => {
    if (form.purchaseRequestId && isNew) {
      getApprovedQuotationsForRequest(form.purchaseRequestId).then((q) =>
        setQuotations(q as QuotationOption[])
      );
    }
  }, [form.purchaseRequestId, isNew]);

  useEffect(() => {
    if (!isNew || !defaultQuotationIds.length || !quotations.length) return;

    const ids = defaultQuotationIds.filter((id) => quotations.some((q) => q.id === id));
    if (!ids.length) return;

    setSelectedQuotationIds(ids);
    const selected = quotations.filter((q) => ids.includes(q.id));
    const items: typeof form.items = [];
    selected.forEach((q) => {
      q.items.forEach((item) => {
        items.push({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitId: item.unitId || '',
          supplierId: q.supplierId,
          supplierName: q.supplier.nameAr,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          netAmount: item.total,
          isSelected: false,
          quotationId: q.id,
          quotationNo: q.documentNo,
          notes: '',
        });
      });
    });
    setForm((f) => ({ ...f, items }));
  }, [isNew, defaultQuotationIds, quotations]);

  const buildItemsFromQuotations = (ids: string[]) => {
    const selected = quotations.filter((q) => ids.includes(q.id));
    const items: typeof form.items = [];
    selected.forEach((q) => {
      q.items.forEach((item) => {
        items.push({
          itemId: item.itemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitId: item.unitId || '',
          supplierId: q.supplierId,
          supplierName: q.supplier.nameAr,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          netAmount: item.total,
          isSelected: false,
          quotationId: q.id,
          quotationNo: q.documentNo,
          notes: '',
        });
      });
    });
    setForm((f) => ({ ...f, items }));
  };

  const toggleQuotation = (id: string) => {
    const ids = selectedQuotationIds.includes(id)
      ? selectedQuotationIds.filter((x) => x !== id)
      : [...selectedQuotationIds, id];
    setSelectedQuotationIds(ids);
    buildItemsFromQuotations(ids);
  };

  const handleRequestChange = (requestId: string) => {
    const request = approvedRequests.find((r) => r.id === requestId);
    if (!request) return;
    setForm({
      ...form,
      purchaseRequestId: requestId,
      purchaseCycleId: request.purchaseCycleId,
      branchId: request.branchId,
      currencyId: request.currencyId || form.currencyId,
      items: [],
    });
    setSelectedQuotationIds([]);
  };

  const updateItemUnitPrice = (idx: number, unitPrice: number) => {
    const items = [...form.items];
    const item = { ...items[idx], unitPrice, netAmount: items[idx].quantity * unitPrice };
    items[idx] = item;
    setForm({ ...form, items });
  };

  const handleSave = async (submit = false, recipientUserIds?: string[]) => {
    setLoading(true);
    setError('');
    if (!selectedQuotationIds.length) {
      setError('يجب اختيار عرض سعر واحد على الأقل');
      setLoading(false);
      throw new Error('يجب اختيار عرض سعر واحد على الأقل');
    }
    if (!form.items.length) {
      setError('يجب إضافة أصناف للمقارنة');
      setLoading(false);
      throw new Error('يجب إضافة أصناف للمقارنة');
    }
    try {
      const payload = {
        purchaseCycleId: form.purchaseCycleId,
        branchId: form.branchId,
        quotationIds: selectedQuotationIds,
        currencyId: form.currencyId,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        items: form.items,
      };
      let result;
      if (isNew) {
        result = await createComparison(payload);
      } else {
        result = await updateComparison(existing!.id as string, payload);
      }
      if (submit && result) {
        await submitComparison(result.id, recipientUserIds);
      }
      router.push(`/purchases/comparisons/${result?.id || existing?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف المقارنة ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deleteComparison(existing.id as string);
      showDeleteSuccess();
      router.push('/purchases/comparisons');
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
      await submitComparison(existing.id as string, recipientUserIds);
      getDocumentApproval('TECHNICAL_COMPARISON', existing.id as string).then(setApproval);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
      throw err;
    }
  };

  const refreshApproval = () => {
    if (!existing?.id) return;
    getDocumentApproval('TECHNICAL_COMPARISON', existing.id as string).then(setApproval);
    router.refresh();
  };

  const comparisonTotal = form.items.reduce((s, i) => s + (i.netAmount ?? 0), 0);

  const { toolbarProps, effectiveEditable, recipientModal } = useOperationFormToolbar({
    operationType: 'comparison',
    isNew,
    existing,
    usage,
    approval,
    loading,
    approvalContext: {
      branchId: form.branchId,
      totalAmount: comparisonTotal,
    },
    onSave: handleSave,
    onSubmitOnly: handleSubmitOnly,
    onAfterWorkflowAction: refreshApproval,
  });

  const cascadeLock = isCascadeLockActive(
    isNew,
    defaultRequestId,
    form.purchaseRequestId,
    selectedQuotationIds.length > 0 ? selectedQuotationIds[0] : undefined
  );

  return (
    <>
      <Header
        title={isNew ? 'مقارنة فنية جديدة' : `مقارنة فنية ${existing?.documentNo}`}
        subtitle="APST003"
      />
      <PageContainer>
        <OperationToolbar {...toolbarProps} />
        {recipientModal}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {isNew && (
              <div className="card">
                <h2 className="font-semibold mb-4">اختيار عروض الأسعار</h2>
                {defaultQuotationIds.length > 0 && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    تم إنزال عروض الأسعار المحددة من المرحلة السابقة
                  </div>
                )}
                <div className="mb-4">
                  <label className="form-label">طلب الشراء</label>
                  <select
                    className="form-input"
                    value={form.purchaseRequestId}
                    disabled={masterFieldDisabled(effectiveEditable)}
                    onChange={(e) => handleRequestChange(e.target.value)}
                  >
                    {approvedRequests.map((r) => (
                      <option key={r.id} value={r.id}>{r.documentNo}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {quotations.map((q) => (
                    <label key={q.id} className={`flex items-center gap-2 p-2 rounded border ${effectiveEditable ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={selectedQuotationIds.includes(q.id)}
                        disabled={masterFieldDisabled(effectiveEditable)}
                        onChange={() => toggleQuotation(q.id)}
                      />
                      <span>{q.documentNo} - {q.supplier.nameAr}</span>
                    </label>
                  ))}
                  {quotations.length === 0 && (
                    <p className="text-sm text-gray-500">لا توجد عروض أسعار معتمدة لهذا الطلب</p>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold mb-4">بيانات إضافية</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">العملة</label>
                  <MasterDataSelect
                    kind="currency"
                    value={form.currencyId}
                    onChange={(currencyId) => setForm({ ...form, currencyId })}
                    options={masterData.currencies}
                    disabled={masterFieldDisabled(effectiveEditable)}
                    allowEmpty={false}
                  />
                </div>
                <div>
                  <label className="form-label">طريقة الدفع</label>
                  <PaymentMethodSelect
                    value={form.paymentMethod}
                    disabled={masterFieldDisabled(effectiveEditable)}
                    onChange={(paymentMethod) =>
                      setForm({ ...form, paymentMethod: normalizePaymentMethod(paymentMethod) })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">الملاحظات</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.notes}
                    disabled={masterFieldDisabled(effectiveEditable)}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">بنود المقارنة</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right">الصنف</th>
                      <th className="px-3 py-2 text-right">المورد</th>
                      <th className="px-3 py-2 text-right">عرض السعر</th>
                      <th className="px-3 py-2 text-right">الكمية</th>
                      <th className="px-3 py-2 text-right">السعر</th>
                      <th className="px-3 py-2 text-right">الصافي</th>
                      {!isNew && <th className="px-3 py-2 text-right">مختار</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {form.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{item.itemNameSnapshot}</td>
                        <td className="px-3 py-2">{item.supplierName}</td>
                        <td className="px-3 py-2">{item.quotationNo}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">
                          {cascadeLock && effectiveEditable ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input text-sm w-24"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItemUnitPrice(idx, parseFloat(e.target.value) || 0)
                              }
                            />
                          ) : (
                            item.unitPrice.toFixed(2)
                          )}
                        </td>
                        <td className="px-3 py-2">{formatCurrency(item.netAmount)}</td>
                        {!isNew && (
                          <td className="px-3 py-2">
                            {item.isSelected ? '✓' : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DocumentFormFooter
              listHref="/purchases/comparisons"
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
                  المقارنة معتمدة. يمكن إنشاء{' '}
                  <a href={`/purchases/orders/new?comparisonId=${existing.id}`} className="font-bold underline">
                    أمر شراء
                  </a>
                  {' '}أو{' '}
                  <a href={`/purchases/supplier-selection/new?comparisonId=${existing.id}`} className="font-bold underline">
                    ترشيح مورد
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
