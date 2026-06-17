'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { createInspection, deleteInspection } from '@/actions/purchase-orders';
import { INSPECTION_RESULTS } from '@/lib/constants';
import { resolveSourceDocument } from '@/lib/document-cascade';
import { DocumentFormHeader, DocumentFormFooter } from '@/components/ui/DocumentFormActions';
import type { MasterData } from '@/types/master-data';

interface ApprovedOrder {
  id: string;
  documentNo: string;
  supplierId: string;
  supplier: { nameAr: string };
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    quantity: number;
  }>;
}

interface InspectionFormProps {
  masterData: MasterData;
  approvedOrders: ApprovedOrder[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultOrderId?: string;
}

export function InspectionForm({
  masterData,
  approvedOrders,
  existing,
  isNew,
  defaultOrderId,
}: InspectionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultOrder = resolveSourceDocument(approvedOrders, defaultOrderId);

  const [form, setForm] = useState({
    purchaseOrderId: (existing?.purchaseOrderId as string) || defaultOrder?.id || '',
    warehouseId: (existing?.warehouseId as string) || '',
    inspectionResult: (existing?.inspectionResult as string) || INSPECTION_RESULTS.ACCEPTED,
    rejectionReason: (existing?.rejectionReason as string) || '',
    notes: (existing?.notes as string) || '',
    items: ((existing?.items as Array<Record<string, unknown>>) || defaultOrder?.items || []).map(
      (i) => ({
        itemId: i.itemId as string,
        itemNameSnapshot: i.itemNameSnapshot as string,
        quantity: i.quantity as number,
        matchedQty: (i.matchedQty as number) ?? (i.quantity as number),
        unmatchedQty: (i.unmatchedQty as number) ?? 0,
        freeQuantity: (i.freeQuantity as number) || 0,
        matchStatus: (i.matchStatus as string) || 'Matched',
        notes: (i.notes as string) || '',
      })
    ),
  });

  const handleOrderChange = (orderId: string) => {
    const order = approvedOrders.find((o) => o.id === orderId);
    if (!order) return;
    setForm({
      ...form,
      purchaseOrderId: orderId,
      items: order.items.map((i) => ({
        itemId: i.itemId,
        itemNameSnapshot: i.itemNameSnapshot,
        quantity: i.quantity,
        matchedQty: i.quantity,
        unmatchedQty: 0,
        freeQuantity: 0,
        matchStatus: 'Matched',
        notes: '',
      })),
    });
  };

  const updateItem = (idx: number, field: string, value: number | string) => {
    const items = [...form.items];
    const item = { ...items[idx], [field]: value };
    if (field === 'matchedQty' || field === 'quantity') {
      item.unmatchedQty = Math.max(0, item.quantity - item.matchedQty);
    }
    items[idx] = item;
    setForm({ ...form, items });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await createInspection(form);
      router.push(`/purchases/inspections/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف الفحص ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deleteInspection(existing.id as string);
      router.push('/purchases/inspections');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title={isNew ? 'فحص مشتريات جديد' : `فحص ${existing?.documentNo}`}
        subtitle="APST006"
        actions={
          <DocumentFormHeader
            listHref="/purchases/inspections"
            listLabel="قائمة الفحوصات"
            status={(existing?.inspectionResult as string) || undefined}
          />
        }
      />
      <PageContainer>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
        )}

        <div className="space-y-4 max-w-4xl">
          <div className="card">
            <h2 className="font-semibold mb-4">البيانات الرئيسية</h2>
            {isNew && (
              <div className="mb-4 space-y-2">
                {defaultOrderId && defaultOrder && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    تم إنزال البيانات من أمر الشراء {defaultOrder.documentNo}
                  </div>
                )}
                <div>
                  <label className="form-label">أمر الشراء *</label>
                  <select
                    className="form-input"
                    value={form.purchaseOrderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
                  >
                    {approvedOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.documentNo} - {o.supplier.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">المخزن</label>
                <select
                  className="form-input"
                  value={form.warehouseId}
                  disabled={!isNew}
                  onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                >
                  <option value="">-- اختر --</option>
                  {masterData.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.nameAr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">نتيجة الفحص *</label>
                <select
                  className="form-input"
                  value={form.inspectionResult}
                  disabled={!isNew}
                  onChange={(e) => setForm({ ...form, inspectionResult: e.target.value })}
                >
                  <option value={INSPECTION_RESULTS.ACCEPTED}>مقبول</option>
                  <option value={INSPECTION_RESULTS.PARTIALLY_ACCEPTED}>مقبول جزئياً</option>
                  <option value={INSPECTION_RESULTS.REJECTED}>مرفوض</option>
                </select>
              </div>
              {form.inspectionResult !== INSPECTION_RESULTS.ACCEPTED && isNew && (
                <div className="col-span-2">
                  <label className="form-label">سبب الرفض / الملاحظات</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.rejectionReason}
                    onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">بنود الفحص</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right">الصنف</th>
                  <th className="px-3 py-2 text-right">الكمية</th>
                  <th className="px-3 py-2 text-right">مطابق</th>
                  <th className="px-3 py-2 text-right">غير مطابق</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{item.itemNameSnapshot}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">
                      {isNew ? (
                        <input
                          type="number"
                          className="form-input text-sm w-24"
                          value={item.matchedQty}
                          onChange={(e) => updateItem(idx, 'matchedQty', parseFloat(e.target.value) || 0)}
                        />
                      ) : (
                        item.matchedQty
                      )}
                    </td>
                    <td className="px-3 py-2">{item.unmatchedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DocumentFormFooter
            listHref="/purchases/inspections"
            isEditable={!!isNew}
            isNew={isNew}
            canDelete={!isNew}
            loading={loading}
            status={existing?.inspectionResult as string}
            saveLabel="حفظ الفحص"
            showSubmit={false}
            onSaveDraft={handleSave}
            onDelete={handleDelete}
          />

          {!isNew && existing?.inspectionResult !== INSPECTION_RESULTS.REJECTED && (
            <div className="card bg-green-50 border-green-200">
              <p className="text-green-800 text-sm">
                يمكن إنشاء{' '}
                <a href={`/purchases/receivings/new?orderId=${existing?.purchaseOrderId}&inspectionId=${existing?.id}`} className="font-bold underline">
                  إذن توريد
                </a>
              </p>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
