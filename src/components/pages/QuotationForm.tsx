'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ItemsGrid, LineItem } from '@/components/ui/ItemsGrid';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { OperationToolbar } from '@/components/ui/OperationToolbar';
import { createQuotation, updateQuotation, submitQuotation, deleteQuotation } from '@/actions/quotations';
import { fetchApprovedPurchaseRequests } from '@/actions/purchase-requests';
import { fetchDocumentUsage, getDocumentApproval } from '@/actions/common';
import { formatCurrency } from '@/lib/utils';
import { normalizePaymentMethod } from '@/lib/constants';
import { PaymentMethodSelect } from '@/components/ui/PaymentMethodSelect';
import { resolveSourceDocument } from '@/lib/document-cascade';
import { DocumentFormFooter, EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';
import { useOperationFormToolbar } from '@/hooks/useOperationFormToolbar';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';
import { MasterDataSelect } from '@/components/ui/MasterDataSelect';
import type { MasterData } from '@/types/master-data';

interface ApprovedRequest {
  id: string;
  documentNo: string;
  branchId: string;
  purchaseCycleId: string;
  currencyId?: string | null;
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    unitId?: string | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
  }>;
}

interface QuotationFormProps {
  masterData: MasterData;
  approvedRequests: ApprovedRequest[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultRequestId?: string;
}

export function QuotationForm({
  masterData,
  approvedRequests,
  existing,
  isNew,
  defaultRequestId,
}: QuotationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approval, setApproval] = useState<Parameters<typeof ApprovalTimeline>[0]['approval']>(null);
  const [usage, setUsage] = useState<UsedDocumentInfo | null>(null);
  const [requestOptions, setRequestOptions] = useState(approvedRequests);
  const [showUsedRequests, setShowUsedRequests] = useState(false);

  const defaultRequest = resolveSourceDocument(requestOptions, defaultRequestId);

  const [form, setForm] = useState({
    purchaseRequestId: (existing?.purchaseRequestId as string) || defaultRequest?.id || '',
    branchId: (existing?.branchId as string) || defaultRequest?.branchId || masterData.branches[0]?.id || '',
    supplierId: (existing?.supplierId as string) || '',
    paymentMethod: normalizePaymentMethod(existing?.paymentMethod as string),
    costMethod: (existing?.costMethod as string) || '',
    creditPeriod: (existing?.creditPeriod as number) || 0,
    deliveryDays: (existing?.deliveryDays as number) || 0,
    paymentTerms: (existing?.paymentTerms as string) || '',
    currencyId:
      (existing?.currencyId as string) ||
      defaultRequest?.currencyId ||
      masterData.currencies[0]?.id ||
      '',
    referenceNo: (existing?.referenceNo as string) || '',
    expiryDate: existing?.expiryDate
      ? new Date(existing.expiryDate as string).toISOString().split('T')[0]
      : '',
    notes: (existing?.notes as string) || '',
    discount: (existing?.discount as number) || 0,
    extraDiscount: (existing?.extraDiscount as number) || 0,
    items: ((existing?.items as Array<Record<string, unknown>>) || defaultRequest?.items || []).map(
      (i) => ({
        itemId: i.itemId as string,
        itemNameSnapshot: i.itemNameSnapshot as string,
        unitId: (i.unitId as string) || '',
        quantity: i.quantity as number,
        unitPrice: (i.unitPrice as number) || 0,
        discount: (i.discount as number) || 0,
        tax: (i.tax as number) || 0,
        total: (i.total as number) || 0,
        notes: (i.notes as string) || '',
      })
    ) as LineItem[],
  });

  const isEditable = isNew || EDITABLE_DOC_STATUSES.includes(existing?.status as string);

  useEffect(() => {
    if (existing?.id) {
      getDocumentApproval('QUOTATION', existing.id as string).then(setApproval);
      fetchDocumentUsage('QUOTATION', existing.id as string).then(setUsage);
    }
  }, [existing?.id]);

  useEffect(() => {
    if (!isNew) return;
    fetchApprovedPurchaseRequests(showUsedRequests)
      .then((rows) => setRequestOptions(rows as ApprovedRequest[]))
      .catch(() => {});
  }, [showUsedRequests, isNew]);

  const handleRequestChange = (requestId: string) => {
    const request = requestOptions.find((r) => r.id === requestId);
    if (!request) return;
    setForm({
      ...form,
      purchaseRequestId: requestId,
      branchId: request.branchId,
      currencyId: request.currencyId || form.currencyId,
      items: request.items.map((i) => ({
        itemId: i.itemId,
        itemNameSnapshot: i.itemNameSnapshot,
        unitId: i.unitId || '',
        quantity: i.quantity,
        unitPrice: i.unitPrice || 0,
        discount: i.discount || 0,
        tax: i.tax || 0,
        total: i.total || 0,
        notes: '',
      })),
    });
  };

  const handleSave = async (submit = false) => {
    setLoading(true);
    setError('');
    if (!form.supplierId) {
      setError('يجب اختيار المورد');
      setLoading(false);
      return;
    }
    if (!form.items.length) {
      setError('يجب اختيار صنف واحد على الأقل');
      setLoading(false);
      return;
    }
    try {
      let result;
      if (isNew) {
        result = await createQuotation(form);
      } else {
        result = await updateQuotation(existing!.id as string, form);
      }
      if (submit && result) {
        await submitQuotation(result.id);
      }
      router.push(`/purchases/quotations/${result?.id || existing?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف عرض السعر ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deleteQuotation(existing.id as string);
      router.push('/purchases/quotations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  const handleSubmitOnly = async () => {
    if (!existing?.id) return;
    setLoading(true);
    setError('');
    try {
      await submitQuotation(existing.id as string);
      getDocumentApproval('QUOTATION', existing.id as string).then(setApproval);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const total = subtotal - form.discount - form.extraDiscount;

  const refreshApproval = () => {
    if (!existing?.id) return;
    getDocumentApproval('QUOTATION', existing.id as string).then(setApproval);
    router.refresh();
  };

  const { toolbarProps, effectiveEditable } = useOperationFormToolbar({
    operationType: 'quotation',
    isNew,
    existing,
    usage,
    approval,
    loading,
    onSave: handleSave,
    onSubmitOnly: handleSubmitOnly,
    onAfterWorkflowAction: refreshApproval,
  });

  return (
    <>
      <Header
        title={isNew ? 'عرض سعر جديد' : `عرض سعر ${existing?.documentNo}`}
        subtitle="APST002"
      />
      <PageContainer>
        <OperationToolbar {...toolbarProps} />
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="font-semibold mb-4">البيانات الرئيسية</h2>
              <div className="grid grid-cols-2 gap-4">
                {isNew && (
                  <div className="col-span-2 space-y-2">
                    {defaultRequestId && defaultRequest && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        تم إنزال البيانات من طلب الشراء {defaultRequest.documentNo}
                      </div>
                    )}
                    <div>
                      <label className="form-label">طلب الشراء *</label>
                      <select
                        className="form-input"
                        value={form.purchaseRequestId}
                        onChange={(e) => handleRequestChange(e.target.value)}
                      >
                        {requestOptions.length === 0 ? (
                          <option value="">لا توجد طلبات متاحة</option>
                        ) : (
                          requestOptions.map((r) => (
                            <option key={r.id} value={r.id}>{r.documentNo}</option>
                          ))
                        )}
                      </select>
                      <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={showUsedRequests}
                          onChange={(e) => setShowUsedRequests(e.target.checked)}
                        />
                        إظهار المستخدمة
                      </label>
                    </div>
                  </div>
                )}
                <div>
                  <label className="form-label">المورد *</label>
                  <MasterDataSelect
                    kind="supplier"
                    value={form.supplierId}
                    onChange={(supplierId) => setForm({ ...form, supplierId })}
                    options={masterData.suppliers}
                    disabled={!effectiveEditable}
                  />
                </div>
                <div>
                  <label className="form-label">العملة</label>
                  <MasterDataSelect
                    kind="currency"
                    value={form.currencyId}
                    onChange={(currencyId) => setForm({ ...form, currencyId })}
                    options={masterData.currencies}
                    disabled={!effectiveEditable}
                    allowEmpty={false}
                  />
                </div>
                <div>
                  <label className="form-label">طريقة الدفع</label>
                  <PaymentMethodSelect
                    value={form.paymentMethod}
                    disabled={!effectiveEditable}
                    onChange={(paymentMethod) =>
                      setForm({ ...form, paymentMethod: normalizePaymentMethod(paymentMethod) })
                    }
                  />
                </div>
                <div>
                  <label className="form-label">أيام التسليم</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.deliveryDays}
                    disabled={!effectiveEditable}
                    onChange={(e) => setForm({ ...form, deliveryDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="form-label">تاريخ انتهاء العرض</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.expiryDate}
                    disabled={!effectiveEditable}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
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

            <DocumentFormFooter
              listHref="/purchases/quotations"
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
                  العرض معتمد. يمكن إنشاء{' '}
                  <a href={`/purchases/comparisons/new?requestId=${existing.purchaseRequestId}&quotationId=${existing.id}`} className="font-bold underline">
                    مقارنة فنية
                  </a>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold mb-4">مسار الاعتماد</h2>
              <ApprovalTimeline
                approval={approval}
                onAction={refreshApproval}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="card">
              <h2 className="font-semibold mb-4">الأصناف</h2>
              <ItemsGrid
                items={form.items}
                onChange={(items) => setForm({ ...form, items })}
                availableItems={masterData.items}
                readOnly={!effectiveEditable}
              />
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span>الإجمالي: {formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
