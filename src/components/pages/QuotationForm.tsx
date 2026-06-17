'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ItemsGrid, LineItem } from '@/components/ui/ItemsGrid';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { createQuotation, updateQuotation, submitQuotation, deleteQuotation } from '@/actions/quotations';
import { getDocumentApproval } from '@/actions/common';
import { formatCurrency } from '@/lib/utils';
import { resolveSourceDocument } from '@/lib/document-cascade';
import { DocumentFormHeader, DocumentFormFooter, EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';
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
  const [approval, setApproval] = useState<unknown>(null);

  const defaultRequest = resolveSourceDocument(approvedRequests, defaultRequestId);

  const [form, setForm] = useState({
    purchaseRequestId: (existing?.purchaseRequestId as string) || defaultRequest?.id || '',
    branchId: (existing?.branchId as string) || defaultRequest?.branchId || masterData.branches[0]?.id || '',
    supplierId: (existing?.supplierId as string) || '',
    paymentMethod: (existing?.paymentMethod as string) || '',
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
    }
  }, [existing?.id]);

  const handleRequestChange = (requestId: string) => {
    const request = approvedRequests.find((r) => r.id === requestId);
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

  return (
    <>
      <Header
        title={isNew ? 'عرض سعر جديد' : `عرض سعر ${existing?.documentNo}`}
        subtitle="APST002"
        actions={
          <DocumentFormHeader
            listHref="/purchases/quotations"
            listLabel="قائمة عروض الأسعار"
            status={existing?.status as string}
          />
        }
      />
      <PageContainer>
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
                        {approvedRequests.map((r) => (
                          <option key={r.id} value={r.id}>{r.documentNo}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="form-label">المورد *</label>
                  <select
                    className="form-input"
                    value={form.supplierId}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  >
                    <option value="">-- اختر --</option>
                    {masterData.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">العملة</label>
                  <select
                    className="form-input"
                    value={form.currencyId}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, currencyId: e.target.value })}
                  >
                    {masterData.currencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">طريقة الدفع</label>
                  <input
                    className="form-input"
                    value={form.paymentMethod}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">أيام التسليم</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.deliveryDays}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, deliveryDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="form-label">تاريخ انتهاء العرض</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.expiryDate}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">الملاحظات</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.notes}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">الأصناف</h2>
              <ItemsGrid
                items={form.items}
                onChange={(items) => setForm({ ...form, items })}
                availableItems={masterData.items}
                readOnly={!isEditable}
              />
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span>الإجمالي: {formatCurrency(total)}</span>
              </div>
            </div>

            <DocumentFormFooter
              listHref="/purchases/quotations"
              isEditable={isEditable}
              isNew={isNew}
              canDelete={existing?.status === 'Draft'}
              loading={loading}
              status={existing?.status as string}
              onSaveDraft={() => handleSave(false)}
              onSubmit={() => (isNew ? handleSave(true) : handleSubmitOnly())}
              onDelete={handleDelete}
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
                approval={approval as Parameters<typeof ApprovalTimeline>[0]['approval']}
                onAction={() => {
                  if (existing?.id) {
                    getDocumentApproval('QUOTATION', existing.id as string).then(setApproval);
                    router.refresh();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
