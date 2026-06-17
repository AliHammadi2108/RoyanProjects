'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { createReceiving, deleteReceiving } from '@/actions/purchase-orders';
import { DocumentFormHeader, DocumentFormFooter } from '@/components/ui/DocumentFormActions';
import {
  resolveSourceDocument,
  buildReceivingItemsFromOrder,
} from '@/lib/document-cascade';
import type { MasterData } from '@/types/master-data';

interface OrderOption {
  id: string;
  documentNo: string;
  branchId: string;
  supplierId: string;
  supplier: { nameAr: string };
  items: Array<{ itemId: string; itemNameSnapshot: string; quantity: number }>;
  inspections: Array<{
    id: string;
    documentNo: string;
    inspectionResult: string;
    items: Array<{ itemId: string; matchedQty: number }>;
  }>;
}

interface ReceivingFormProps {
  masterData: MasterData;
  orders: OrderOption[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultOrderId?: string;
  defaultInspectionId?: string;
}

export function ReceivingForm({
  masterData,
  orders,
  existing,
  isNew,
  defaultOrderId,
  defaultInspectionId,
}: ReceivingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultOrder = resolveSourceDocument(orders, defaultOrderId);
  const defaultInspection =
    defaultOrder?.inspections.find((i) => i.id === defaultInspectionId) ||
    defaultOrder?.inspections[0];

  const [form, setForm] = useState({
    purchaseOrderId: (existing?.purchaseOrderId as string) || defaultOrder?.id || '',
    inspectionId: (existing?.inspectionId as string) || defaultInspection?.id || '',
    branchId: (existing?.branchId as string) || defaultOrder?.branchId || masterData.branches[0]?.id || '',
    supplierId: (existing?.supplierId as string) || defaultOrder?.supplierId || '',
    warehouseId: (existing?.warehouseId as string) || '',
    supplierInvoiceNo: (existing?.supplierInvoiceNo as string) || '',
    supplierInvoiceDate: existing?.supplierInvoiceDate
      ? new Date(existing.supplierInvoiceDate as string).toISOString().split('T')[0]
      : '',
    notes: (existing?.notes as string) || '',
    items:
      (existing?.items as Array<Record<string, unknown>>)?.map((i) => ({
        itemId: i.itemId as string,
        itemNameSnapshot: i.itemNameSnapshot as string,
        receivedQty: (i.receivedQty as number) ?? 0,
        freeQuantity: (i.freeQuantity as number) || 0,
        notes: (i.notes as string) || '',
      })) ||
      buildReceivingItemsFromOrder(defaultOrder, defaultInspection?.id),
  });

  const selectedOrder = orders.find((o) => o.id === form.purchaseOrderId);

  const handleOrderChange = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const inspection = order.inspections[0];
    setForm({
      ...form,
      purchaseOrderId: orderId,
      inspectionId: inspection?.id || '',
      branchId: order.branchId,
      supplierId: order.supplierId,
      items: buildReceivingItemsFromOrder(order, inspection?.id),
    });
  };

  const handleInspectionChange = (inspectionId: string) => {
    const order = orders.find((o) => o.id === form.purchaseOrderId);
    if (!order) return;
    setForm({
      ...form,
      inspectionId,
      items: buildReceivingItemsFromOrder(order, inspectionId),
    });
  };

  const updateItem = (idx: number, field: string, value: number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        inspectionId: form.inspectionId || undefined,
      };
      const result = await createReceiving(payload);
      router.push(`/purchases/receivings/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف إذن التوريد ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deleteReceiving(existing.id as string);
      router.push('/purchases/receivings');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title={isNew ? 'إذن توريد جديد' : `إذن توريد ${existing?.documentNo}`}
        subtitle="APST007"
        actions={
          <DocumentFormHeader
            listHref="/purchases/receivings"
            listLabel="قائمة إذونات التوريد"
            status={existing?.receivingStatus as string}
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
              <>
                {defaultInspectionId && defaultInspection && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    تم إنزال البيانات من فحص المشتريات {defaultInspection.documentNo}
                  </div>
                )}
                <div className="mb-4">
                  <label className="form-label">أمر الشراء *</label>
                  <select
                    className="form-input"
                    value={form.purchaseOrderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.documentNo} - {o.supplier.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedOrder && selectedOrder.inspections.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label">الفحص</label>
                    <select
                      className="form-input"
                      value={form.inspectionId}
                      onChange={(e) => handleInspectionChange(e.target.value)}
                    >
                      {selectedOrder.inspections.map((i) => (
                        <option key={i.id} value={i.id}>{i.documentNo}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
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
                <label className="form-label">رقم فاتورة المورد</label>
                <input
                  className="form-input"
                  value={form.supplierInvoiceNo}
                  disabled={!isNew}
                  onChange={(e) => setForm({ ...form, supplierInvoiceNo: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">الأصناف المستلمة</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right">الصنف</th>
                  <th className="px-3 py-2 text-right">الكمية المستلمة</th>
                  <th className="px-3 py-2 text-right">كمية مجانية</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{item.itemNameSnapshot}</td>
                    <td className="px-3 py-2">
                      {isNew ? (
                        <input
                          type="number"
                          className="form-input text-sm w-24"
                          value={item.receivedQty}
                          onChange={(e) => updateItem(idx, 'receivedQty', parseFloat(e.target.value) || 0)}
                        />
                      ) : (
                        item.receivedQty
                      )}
                    </td>
                    <td className="px-3 py-2">{item.freeQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DocumentFormFooter
            listHref="/purchases/receivings"
            isEditable={!!isNew}
            isNew={isNew}
            canDelete={!isNew}
            loading={loading}
            status={existing?.receivingStatus as string}
            saveLabel="حفظ إذن التوريد"
            showSubmit={false}
            onSaveDraft={handleSave}
            onDelete={handleDelete}
          />

          {!isNew && (
            <div className="card bg-green-50 border-green-200">
              <p className="text-green-800 text-sm">
                يمكن إنشاء{' '}
                <a href={`/purchases/invoices/new?receivingId=${existing?.id}`} className="font-bold underline">
                  فاتورة مشتريات
                </a>
              </p>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
