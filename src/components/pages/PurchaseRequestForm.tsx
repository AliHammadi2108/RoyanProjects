'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ItemsGrid, LineItem } from '@/components/ui/ItemsGrid';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  createPurchaseRequest,
  updatePurchaseRequest,
  submitPurchaseRequest,
  deletePurchaseRequest,
} from '@/actions/purchase-requests';
import { getDocumentApproval } from '@/actions/common';
import type { MasterData } from '@/types/master-data';

interface PurchaseRequestFormProps {
  masterData: MasterData;
  existing?: Record<string, unknown>;
  isNew?: boolean;
}

export function PurchaseRequestForm({ masterData, existing, isNew }: PurchaseRequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approval, setApproval] = useState<unknown>(null);

  const [form, setForm] = useState({
    branchId: (existing?.branchId as string) || masterData.branches[0]?.id || '',
    departmentId: (existing?.departmentId as string) || '',
    requesterUnit: (existing?.requesterUnit as string) || '',
    purchaseType: (existing?.purchaseType as string) || 'LOCAL',
    warehouseId: (existing?.warehouseId as string) || '',
    supplierId: (existing?.supplierId as string) || '',
    currencyId: (existing?.currencyId as string) || masterData.currencies[0]?.id || '',
    exchangeRate: (existing?.exchangeRate as number) || 1,
    referenceNo: (existing?.referenceNo as string) || '',
    qualityLevel: (existing?.qualityLevel as string) || '',
    requiredDate: existing?.requiredDate
      ? new Date(existing.requiredDate as string).toISOString().split('T')[0]
      : '',
    notes: (existing?.notes as string) || '',
    items: ((existing?.items as Array<Record<string, unknown>>) || []).map((i) => ({
      itemId: i.itemId as string,
      itemNameSnapshot: i.itemNameSnapshot as string,
      itemUnitId: (i.itemUnitId as string) || undefined,
      unitId: (i.unitId as string) || undefined,
      factorToBase: (i.factorToBase as number) || undefined,
      baseQty: (i.baseQty as number) || undefined,
      quantity: i.quantity as number,
      unitPrice: i.unitPrice as number,
      discount: (i.discount as number) || 0,
      tax: (i.tax as number) || 0,
      total: i.total as number,
      notes: (i.notes as string) || undefined,
    })) as LineItem[],
  });

  const isEditable = isNew || ['Draft', 'Returned For Edit'].includes(existing?.status as string);

  useEffect(() => {
    if (existing?.id) {
      getDocumentApproval('PURCHASE_REQUEST', existing.id as string).then(setApproval);
    }
  }, [existing?.id]);

  const handleSupplierChange = (supplierId: string) => {
    const supplier = masterData.suppliers.find((s) => s.id === supplierId);
    const currencyId = supplier?.defaultCurrencyId || supplier?.defaultCurrency?.id || form.currencyId;
    const currency = masterData.currencies.find((c) => c.id === currencyId);
    const exchangeRate = currency?.rateToBase ?? currency?.rate ?? 1;
    setForm({ ...form, supplierId, currencyId: currencyId || form.currencyId, exchangeRate });
  };

  const handleCurrencyChange = (currencyId: string) => {
    const currency = masterData.currencies.find((c) => c.id === currencyId);
    const exchangeRate = currency?.rateToBase ?? currency?.rate ?? 1;
    setForm({ ...form, currencyId, exchangeRate });
  };

  const handleSave = async (submit = false) => {
    setLoading(true);
    setError('');

    if (!form.branchId) {
      setError('يجب اختيار الفرع');
      setLoading(false);
      return;
    }
    if (!form.items.length) {
      setError('يجب اختيار صنف واحد على الأقل من جدول الأصناف');
      setLoading(false);
      return;
    }

    try {
      const data = { ...form, purchaseType: form.purchaseType };
      let result;
      if (isNew) {
        result = await createPurchaseRequest(data);
      } else {
        result = await updatePurchaseRequest(existing!.id as string, data);
      }

      if (submit && result) {
        await submitPurchaseRequest(result.id);
      }

      router.push(`/purchases/requests/${result?.id || existing?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id || existing.status !== 'Draft') return;
    if (!confirm(`هل تريد حذف طلب الشراء ${existing.documentNo}؟`)) return;
    setLoading(true);
    setError('');
    try {
      await deletePurchaseRequest(existing.id as string);
      router.push('/purchases/requests');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title={isNew ? 'طلب شراء جديد' : `طلب شراء ${existing?.documentNo}`}
        subtitle="APST001"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/purchases/requests" className="btn-secondary text-sm">
              <ArrowRight className="w-4 h-4" /> قائمة الطلبات
            </Link>
            {!isNew && existing?.status ? (
              <StatusBadge status={existing.status as string} />
            ) : null}
          </div>
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
                <div>
                  <label className="form-label">الفرع *</label>
                  <select
                    className="form-input"
                    value={form.branchId}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  >
                    {masterData.branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">الإدارة / القسم</label>
                  <select
                    className="form-input"
                    value={form.departmentId}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  >
                    <option value="">-- اختر --</option>
                    {masterData.departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">نوع عملية الشراء</label>
                  <select
                    className="form-input"
                    value={form.purchaseType}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, purchaseType: e.target.value })}
                  >
                    <option value="LOCAL">محلي</option>
                    <option value="IMPORT">استيراد</option>
                    <option value="SERVICE">خدمات</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">المخزن</label>
                  <select
                    className="form-input"
                    value={form.warehouseId}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                  >
                    <option value="">-- اختر --</option>
                    {masterData.warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">المورد</label>
                  <select
                    className="form-input"
                    value={form.supplierId}
                    disabled={!isEditable}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                  >
                    <option value="">-- اختر --</option>
                    {masterData.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} - {s.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">العملة</label>
                  <select
                    className="form-input"
                    value={form.currencyId}
                    disabled={!isEditable}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                  >
                    {masterData.currencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">سعر الصرف (لحظة العملية)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={form.exchangeRate}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, exchangeRate: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="form-label">تاريخ التوفير المطلوب</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.requiredDate}
                    disabled={!isEditable}
                    onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">البيان / الملاحظات</label>
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
            </div>

            {isEditable && (
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => handleSave(false)} disabled={loading} className="btn-secondary">
                  حفظ
                </button>
                <button onClick={() => handleSave(true)} disabled={loading} className="btn-primary">
                  إرسال للاعتماد
                </button>
                {!isNew && existing?.status === 'Draft' && (
                  <button
                    type="button"
                    onClick={handleDelete}
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
                  هذا الطلب في حالة <strong>{existing?.status as string}</strong> ولا يمكن تعديله.
                  استخدم زر <strong>قائمة الطلبات</strong> أعلاه لاستعراض جميع الطلبات.
                </p>
              </div>
            )}

            {existing?.status === 'Approved' && (
              <div className="card bg-green-50 border-green-200">
                <p className="text-green-800 text-sm">
                  الطلب معتمد. يمكن إنشاء{' '}
                  <a href={`/purchases/quotations/new?requestId=${existing.id}`} className="font-bold underline">
                    عرض سعر
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
                    getDocumentApproval('PURCHASE_REQUEST', existing.id as string).then(setApproval);
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
