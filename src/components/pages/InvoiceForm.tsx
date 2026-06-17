'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ItemsGrid, LineItem } from '@/components/ui/ItemsGrid';
import { OperationToolbar } from '@/components/ui/OperationToolbar';
import { createInvoice, deleteInvoice } from '@/actions/purchase-orders';
import { DocumentFormFooter } from '@/components/ui/DocumentFormActions';
import { useOperationFormToolbar } from '@/hooks/useOperationFormToolbar';
import { formatCurrency } from '@/lib/utils';
import { normalizePaymentMethod } from '@/lib/constants';
import { PaymentMethodSelect } from '@/components/ui/PaymentMethodSelect';
import {
  resolveSourceDocument,
  buildInvoiceItemsFromReceiving,
} from '@/lib/document-cascade';
import type { MasterData } from '@/types/master-data';

interface ReceivingOption {
  id: string;
  documentNo: string;
  purchaseOrderId: string;
  branchId: string;
  supplierId: string;
  purchaseOrder: {
    documentNo: string;
    items: Array<{
      itemId: string;
      unitId?: string | null;
      unitPrice: number;
      discount: number;
      tax: number;
    }>;
  };
  supplier: { nameAr: string };
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    receivedQty: number;
  }>;
}

interface InvoiceFormProps {
  masterData: MasterData;
  receivings: ReceivingOption[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultOrderId?: string;
  defaultReceivingId?: string;
}

export function InvoiceForm({
  masterData,
  receivings,
  existing,
  isNew,
  defaultOrderId,
  defaultReceivingId,
}: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultReceiving = resolveSourceDocument(receivings, defaultReceivingId)
    || (defaultOrderId
      ? receivings.find((r) => r.purchaseOrderId === defaultOrderId)
      : undefined);

  const [form, setForm] = useState({
    purchaseOrderId: (existing?.purchaseOrderId as string) || defaultReceiving?.purchaseOrderId || '',
    receivingId: (existing?.receivingId as string) || defaultReceiving?.id || '',
    branchId: (existing?.branchId as string) || defaultReceiving?.branchId || masterData.branches[0]?.id || '',
    supplierId: (existing?.supplierId as string) || defaultReceiving?.supplierId || '',
    paymentMethod: normalizePaymentMethod(existing?.paymentMethod as string),
    dueDate: existing?.dueDate
      ? new Date(existing.dueDate as string).toISOString().split('T')[0]
      : '',
    supplierInvoiceNo: (existing?.supplierInvoiceNo as string) || '',
    supplierInvoiceDate: existing?.supplierInvoiceDate
      ? new Date(existing.supplierInvoiceDate as string).toISOString().split('T')[0]
      : '',
    notes: (existing?.notes as string) || '',
    discount: (existing?.discount as number) || 0,
    otherExpenses: (existing?.otherExpenses as number) || 0,
    items:
      ((existing?.items as Array<Record<string, unknown>>) || []).length > 0
        ? (existing?.items as Array<Record<string, unknown>>).map((i) => ({
            itemId: i.itemId as string,
            itemNameSnapshot: i.itemNameSnapshot as string,
            unitId: (i.unitId as string) || '',
            quantity: (i.quantity as number) ?? (i.receivedQty as number),
            unitPrice: (i.unitPrice as number) || 0,
            discount: (i.discount as number) || 0,
            tax: (i.tax as number) || 0,
            total: (i.total as number) || 0,
            notes: (i.notes as string) || '',
          }))
        : buildInvoiceItemsFromReceiving(
            defaultReceiving?.items || [],
            defaultReceiving?.purchaseOrder.items || []
          ) as LineItem[],
  });

  const handleReceivingChange = (receivingId: string) => {
    const receiving = receivings.find((r) => r.id === receivingId);
    if (!receiving) return;
    setForm({
      ...form,
      receivingId,
      purchaseOrderId: receiving.purchaseOrderId,
      branchId: receiving.branchId,
      supplierId: receiving.supplierId,
      items: buildInvoiceItemsFromReceiving(
        receiving.items,
        receiving.purchaseOrder.items || []
      ),
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        receivingId: form.receivingId || undefined,
      };
      const result = await createInvoice(payload);
      router.push(`/purchases/invoices/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const netTotal = subtotal - form.discount + form.otherExpenses;

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف الفاتورة ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deleteInvoice(existing.id as string);
      router.push('/purchases/invoices');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  const isEditable = isNew || existing?.status === 'Draft';

  const { toolbarProps, effectiveEditable } = useOperationFormToolbar({
    operationType: 'invoice',
    isNew,
    existing,
    loading,
    saveLabel: 'حفظ الفاتورة',
    onSave: async () => {
      await handleSave();
    },
  });

  return (
    <>
      <Header
        title={isNew ? 'فاتورة مشتريات جديدة' : `فاتورة ${existing?.documentNo}`}
        subtitle="APST008"
      />
      <PageContainer>
        <OperationToolbar {...toolbarProps} />
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
        )}

        <div className="space-y-4 max-w-4xl">
          <div className="card">
            <h2 className="font-semibold mb-4">البيانات الرئيسية</h2>
            {isNew && (
              <div className="mb-4 space-y-2">
                {defaultReceivingId && defaultReceiving && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    تم إنزال البيانات من إذن التوريد {defaultReceiving.documentNo}
                  </div>
                )}
                <div>
                  <label className="form-label">إذن التوريد</label>
                  <select
                    className="form-input"
                    value={form.receivingId}
                    onChange={(e) => handleReceivingChange(e.target.value)}
                  >
                    {receivings.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.documentNo} - {r.purchaseOrder.documentNo} - {r.supplier.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">رقم فاتورة المورد</label>
                <input
                  className="form-input"
                  value={form.supplierInvoiceNo}
                  disabled={!effectiveEditable}
                  onChange={(e) => setForm({ ...form, supplierInvoiceNo: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">طريقة الدفع</label>
                <PaymentMethodSelect
                  value={form.paymentMethod}
                  disabled={!effectiveEditable}
                  onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
                />
              </div>
              <div>
                <label className="form-label">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dueDate}
                  disabled={!effectiveEditable}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
              readOnly={!effectiveEditable}
            />
            <div className="mt-4 text-left font-bold">صافي المبلغ: {formatCurrency(netTotal)}</div>
          </div>

          <DocumentFormFooter
            listHref="/purchases/invoices"
            isEditable={false}
            isNew={isNew}
            canDelete={existing?.status === 'Draft'}
            loading={loading}
            status={existing?.status as string}
            hideActions
            hideReadOnlyMessage
            saveLabel="حفظ الفاتورة"
            showSubmit={false}
            onSaveDraft={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </PageContainer>
    </>
  );
}
