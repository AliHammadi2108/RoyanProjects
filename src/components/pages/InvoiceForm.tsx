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
import { useOperationToast } from '@/hooks/useOperationToast';
import { useSaveLock } from '@/hooks/useSaveLock';
import { formatCurrency } from '@/lib/utils';
import { normalizePaymentMethod } from '@/lib/constants';
import { PaymentMethodSelect } from '@/components/ui/PaymentMethodSelect';
import {
  resolveSourceDocument,
  buildInvoiceItemsFromReceiving,
  isCascadeLockActive,
  cascadeFieldDisabled,
} from '@/lib/document-cascade';
import { MasterDataSelect } from '@/components/ui/MasterDataSelect';
import {
  filterCurrenciesForSupplier,
  resolveCurrencyOnSupplierChange,
} from '@/lib/supplier-currency';
import type { MasterData } from '@/types/master-data';
import { supplierPhoneFromMaster } from '@/lib/whatsapp';

interface ReceivingOption {
  id: string;
  documentNo: string;
  purchaseOrderId: string;
  branchId: string;
  supplierId: string;
  purchaseOrder: {
    documentNo: string;
    currencyId?: string | null;
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
  const { showDeleteSuccess } = useOperationToast();
  const { loading, withSaveLock } = useSaveLock();
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
    currencyId:
      (existing?.currencyId as string) ||
      (defaultReceiving?.purchaseOrder as { currencyId?: string } | undefined)?.currencyId ||
      masterData.currencies[0]?.id ||
      '',
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
    if (cascadeLock) return;
    const receiving = receivings.find((r) => r.id === receivingId);
    if (!receiving) return;
    setForm({
      ...form,
      receivingId,
      purchaseOrderId: receiving.purchaseOrderId,
      branchId: receiving.branchId,
      supplierId: receiving.supplierId,
      currencyId: receiving.purchaseOrder.currencyId || form.currencyId,
      items: buildInvoiceItemsFromReceiving(
        receiving.items,
        receiving.purchaseOrder.items || []
      ),
    });
  };

  const handleSave = async () => {
    await withSaveLock(async () => {
      setError('');
      const payload = {
        ...form,
        receivingId: form.receivingId || undefined,
      };
      const result = await createInvoice(payload);
      router.push(`/purchases/invoices/${result.id}`);
      router.refresh();
    });
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const netTotal = subtotal - form.discount + form.otherExpenses;

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`ط­ط°ظپ ط§ظ„ظپط§طھظˆط±ط© ${existing.documentNo}طں`)) return;
    setError('');
    try {
      await deleteInvoice(existing.id as string);
      showDeleteSuccess();
      router.push('/purchases/invoices');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ظپط´ظ„ ط§ظ„ط­ط°ظپ');
    }
  };

  const isEditable = isNew || existing?.status === 'Draft';

  const { toolbarProps, effectiveEditable } = useOperationFormToolbar({
    operationType: 'invoice',
    isNew,
    existing,
    loading,
    saveLabel: 'ط­ظپط¸ ط§ظ„ظپط§طھظˆط±ط©',
    onSave: async () => {
      await handleSave();
    },
    whatsappMeta: {
      supplierPhone: supplierPhoneFromMaster(
        masterData.suppliers,
        (existing?.supplierId as string) || form.supplierId
      ),
      partyName: masterData.suppliers.find(
        (s) => s.id === ((existing?.supplierId as string) || form.supplierId)
      )?.nameAr,
      totalAmount: netTotal,
      currency:
        (existing?.currency as { symbol?: string; code?: string }) ??
        masterData.currencies.find((c) => c.id === (existing?.currencyId as string)),
    },
  });

  const selectedSupplier = masterData.suppliers.find((s) => s.id === form.supplierId);
  const supplierCurrencyOptions = filterCurrenciesForSupplier(
    masterData.currencies,
    selectedSupplier
  );

  const cascadeLock = isCascadeLockActive(
    isNew,
    defaultReceivingId,
    defaultOrderId,
    form.receivingId
  );

  return (
    <>
      <Header
        title={isNew ? 'ظپط§طھظˆط±ط© ظ…ط´طھط±ظٹط§طھ ط¬ط¯ظٹط¯ط©' : `ظپط§طھظˆط±ط© ${existing?.documentNo}`}
        subtitle="APST008"
      />
      <PageContainer>
        <OperationToolbar {...toolbarProps} />
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-4">ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط±ط¦ظٹط³ظٹط©</h2>
            {isNew && (
              <div className="mb-4 space-y-2">
                {defaultReceivingId && defaultReceiving && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    طھظ… ط¥ظ†ط²ط§ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ…ظ† ط¥ط°ظ† ط§ظ„طھظˆط±ظٹط¯ {defaultReceiving.documentNo}
                  </div>
                )}
                <div>
                  <label className="form-label">ط¥ط°ظ† ط§ظ„طھظˆط±ظٹط¯</label>
                  <select
                    className="form-input"
                    value={form.receivingId}
                    disabled={cascadeFieldDisabled(effectiveEditable, cascadeLock)}
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
                <label className="form-label">ط§ظ„ظ…ظˆط±ط¯</label>
                <MasterDataSelect
                  kind="supplier"
                  value={form.supplierId}
                  onChange={(supplierId) => {
                    const supplier = masterData.suppliers.find((s) => s.id === supplierId);
                    const currencyId = resolveCurrencyOnSupplierChange(supplier, form.currencyId);
                    setForm({ ...form, supplierId, currencyId });
                  }}
                  options={masterData.suppliers}
                  disabled={cascadeFieldDisabled(effectiveEditable, cascadeLock, true)}
                  allowEmpty={false}
                />
              </div>
              <div>
                <label className="form-label">ط§ظ„ط¹ظ…ظ„ط©</label>
                <MasterDataSelect
                  kind="currency"
                  value={form.currencyId}
                  onChange={(currencyId) => setForm({ ...form, currencyId })}
                  options={
                    supplierCurrencyOptions.length
                      ? supplierCurrencyOptions
                      : masterData.currencies
                  }
                  disabled={cascadeFieldDisabled(effectiveEditable, cascadeLock, true)}
                  allowEmpty={false}
                />
              </div>
              <div>
                <label className="form-label">ط±ظ‚ظ… ظپط§طھظˆط±ط© ط§ظ„ظ…ظˆط±ط¯</label>
                <input
                  className="form-input"
                  value={form.supplierInvoiceNo}
                  disabled={cascadeFieldDisabled(effectiveEditable, cascadeLock)}
                  onChange={(e) => setForm({ ...form, supplierInvoiceNo: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹</label>
                <PaymentMethodSelect
                  value={form.paymentMethod}
                  disabled={cascadeFieldDisabled(effectiveEditable, cascadeLock)}
                  onChange={(paymentMethod) =>
                    setForm({ ...form, paymentMethod: normalizePaymentMethod(paymentMethod) })
                  }
                />
              </div>
              <div>
                <label className="form-label">طھط§ط±ظٹط® ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dueDate}
                  disabled={cascadeFieldDisabled(effectiveEditable, cascadeLock)}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">ط§ظ„ط£طµظ†ط§ظپ</h2>
            <ItemsGrid
              items={form.items}
              onChange={(items) => setForm({ ...form, items })}
              availableItems={masterData.items}
              readOnly={!effectiveEditable}
              cascadeLock={cascadeLock && effectiveEditable}
            />
            <div className="mt-4 text-left font-bold">طµط§ظپظٹ ط§ظ„ظ…ط¨ظ„ط؛: {formatCurrency(netTotal)}</div>
          </div>

          <DocumentFormFooter
            listHref="/purchases/invoices"
            isEditable={false}
            isNew={isNew}
            canDelete={existing?.status === 'Draft'}
            loading={loading}
            hideActions
            hideReadOnlyMessage
            saveLabel="ط­ظپط¸ ط§ظ„ظپط§طھظˆط±ط©"
            showSubmit={false}
            onSaveDraft={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </PageContainer>
    </>
  );
}

