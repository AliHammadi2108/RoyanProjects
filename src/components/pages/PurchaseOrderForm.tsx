'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { ItemsGrid, LineItem } from '@/components/ui/ItemsGrid';
import { ApprovalTimeline } from '@/components/ui/ApprovalTimeline';
import { OperationToolbar } from '@/components/ui/OperationToolbar';
import { createPurchaseOrder, updatePurchaseOrder, submitPurchaseOrder, deletePurchaseOrder } from '@/actions/purchase-orders';
import { fetchDocumentUsage, getDocumentApproval } from '@/actions/common';
import { formatCurrency } from '@/lib/utils';
import { normalizePaymentMethod } from '@/lib/constants';
import { PaymentMethodSelect } from '@/components/ui/PaymentMethodSelect';
import {
  resolveSourceDocument,
  buildPurchaseOrderItemsFromComparison,
  resolveComparisonSupplierId,
} from '@/lib/document-cascade';
import { DocumentFormFooter, EDITABLE_DOC_STATUSES } from '@/components/ui/DocumentFormActions';
import { useOperationFormToolbar } from '@/hooks/useOperationFormToolbar';
import { useOperationToast } from '@/hooks/useOperationToast';
import type { UsedDocumentInfo } from '@/components/ui/UsedDocumentBadge';
import { MasterDataSelect } from '@/components/ui/MasterDataSelect';
import type { MasterData } from '@/types/master-data';
import { supplierPhoneFromMaster } from '@/lib/whatsapp';
import {
  filterCurrenciesForSupplier,
  resolveCurrencyOnSupplierChange,
} from '@/lib/supplier-currency';

interface ApprovedNomination {
  id: string;
  documentNo: string;
  branchId: string;
  purchaseCycleId: string;
  supplierId?: string | null;
  supplier?: { nameAr: string } | null;
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    unitId?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
}

interface ApprovedComparison {
  id: string;
  documentNo: string;
  branchId: string;
  purchaseCycleId: string;
  currencyId?: string | null;
  items: Array<{
    itemId: string;
    itemNameSnapshot: string;
    unitId?: string | null;
    supplierId?: string | null;
    quantity: number;
    unitPrice: number;
    isSelected: boolean;
  }>;
}

interface PurchaseOrderFormProps {
  masterData: MasterData;
  approvedNominations: ApprovedNomination[];
  approvedComparisons?: ApprovedComparison[];
  existing?: Record<string, unknown>;
  isNew?: boolean;
  defaultNominationId?: string;
  defaultComparisonId?: string;
}

export function PurchaseOrderForm({
  masterData,
  approvedNominations,
  approvedComparisons = [],
  existing,
  isNew,
  defaultNominationId,
  defaultComparisonId,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const { showDeleteSuccess } = useOperationToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approval, setApproval] = useState<Parameters<typeof ApprovalTimeline>[0]['approval']>(null);
  const [usage, setUsage] = useState<UsedDocumentInfo | null>(null);

  const defaultNomination = resolveSourceDocument(approvedNominations, defaultNominationId);
  const defaultComparison = resolveSourceDocument(approvedComparisons, defaultComparisonId);
  const comparisonItems = defaultComparison
    ? buildPurchaseOrderItemsFromComparison(defaultComparison.items)
    : [];

  const [form, setForm] = useState({
    supplierNominationId: (existing?.supplierNominationId as string) || defaultNomination?.id || '',
    technicalComparisonId: defaultComparison?.id || '',
    purchaseCycleId:
      (existing?.purchaseCycleId as string) ||
      defaultComparison?.purchaseCycleId ||
      defaultNomination?.purchaseCycleId ||
      '',
    branchId:
      (existing?.branchId as string) ||
      defaultComparison?.branchId ||
      defaultNomination?.branchId ||
      masterData.branches[0]?.id ||
      '',
    supplierId:
      (existing?.supplierId as string) ||
      resolveComparisonSupplierId(defaultComparison?.items || []) ||
      defaultNomination?.supplierId ||
      '',
    warehouseId: (existing?.warehouseId as string) || '',
    currencyId:
      (existing?.currencyId as string) ||
      defaultComparison?.currencyId ||
      masterData.currencies[0]?.id ||
      '',
    paymentMethod: normalizePaymentMethod(existing?.paymentMethod as string),
    expectedArrival: existing?.expectedArrival
      ? new Date(existing.expectedArrival as string).toISOString().split('T')[0]
      : '',
    notes: (existing?.notes as string) || '',
    discount: (existing?.discount as number) || 0,
    items: ((existing?.items as Array<Record<string, unknown>>) ||
      (comparisonItems.length ? comparisonItems : defaultNomination?.items) ||
      []
    ).map(
      (i) => ({
        itemId: i.itemId as string,
        itemNameSnapshot: i.itemNameSnapshot as string,
        unitId: (i.unitId as string) || '',
        quantity: i.quantity as number,
        unitPrice: (i.unitPrice as number) || 0,
        discount: (i.discount as number) || 0,
        tax: (i.tax as number) || 0,
        total: (i.total as number) || (i.quantity as number) * ((i.unitPrice as number) || 0),
        notes: (i.notes as string) || '',
      })
    ) as LineItem[],
  });

  const isEditable = isNew || EDITABLE_DOC_STATUSES.includes(existing?.status as string);

  const selectedSupplier = useMemo(
    () => masterData.suppliers.find((s) => s.id === form.supplierId),
    [masterData.suppliers, form.supplierId]
  );
  const supplierCurrencyOptions = useMemo(
    () => filterCurrenciesForSupplier(masterData.currencies, selectedSupplier),
    [masterData.currencies, selectedSupplier]
  );

  useEffect(() => {
    if (existing?.id) {
      getDocumentApproval('PURCHASE_ORDER', existing.id as string).then(setApproval);
      fetchDocumentUsage('PURCHASE_ORDER', existing.id as string).then(setUsage);
    }
  }, [existing?.id]);

  const handleNominationChange = (nominationId: string) => {
    const nomination = approvedNominations.find((n) => n.id === nominationId);
    if (!nomination) return;
    setForm({
      ...form,
      supplierNominationId: nominationId,
      technicalComparisonId: '',
      purchaseCycleId: nomination.purchaseCycleId,
      branchId: nomination.branchId,
      supplierId: nomination.supplierId || '',
      currencyId: resolveCurrencyOnSupplierChange(
        masterData.suppliers.find((s) => s.id === (nomination.supplierId || '')),
        form.currencyId
      ),
      items: nomination.items.map((i) => ({
        itemId: i.itemId,
        itemNameSnapshot: i.itemNameSnapshot,
        unitId: i.unitId || '',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: 0,
        tax: 0,
        total: i.quantity * i.unitPrice,
        notes: '',
      })),
    });
  };

  const handleComparisonChange = (comparisonId: string) => {
    const comparison = approvedComparisons.find((c) => c.id === comparisonId);
    if (!comparison) return;
    setForm({
      ...form,
      supplierNominationId: '',
      technicalComparisonId: comparisonId,
      purchaseCycleId: comparison.purchaseCycleId,
      branchId: comparison.branchId,
      supplierId: resolveComparisonSupplierId(comparison.items),
      currencyId: comparison.currencyId || resolveCurrencyOnSupplierChange(
        masterData.suppliers.find((s) => s.id === resolveComparisonSupplierId(comparison.items)),
        form.currencyId
      ),
      items: buildPurchaseOrderItemsFromComparison(comparison.items),
    });
  };

  const handleSave = async (submit = false, recipientUserIds?: string[]) => {
    setLoading(true);
    setError('');
    if (!form.items.length) {
      setError('يجب اختيار صنف واحد على الأقل');
      setLoading(false);
      throw new Error('يجب اختيار صنف واحد على الأقل');
    }
    try {
      let result;
      if (isNew) {
        result = await createPurchaseOrder(form);
      } else {
        result = await updatePurchaseOrder(existing!.id as string, form);
      }
      if (submit && result) {
        await submitPurchaseOrder(result.id, recipientUserIds);
      }
      router.push(`/purchases/orders/${result?.id || existing?.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف أمر الشراء ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await deletePurchaseOrder(existing.id as string);
      showDeleteSuccess();
      router.push('/purchases/orders');
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
      await submitPurchaseOrder(existing.id as string, recipientUserIds);
      getDocumentApproval('PURCHASE_ORDER', existing.id as string).then(setApproval);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
      throw err;
    }
  };

  const subtotal = form.items.reduce((s, i) => s + i.total, 0);
  const total = subtotal - form.discount;

  const refreshApproval = () => {
    if (!existing?.id) return;
    getDocumentApproval('PURCHASE_ORDER', existing.id as string).then(setApproval);
    router.refresh();
  };

  const { toolbarProps, effectiveEditable, recipientModal } = useOperationFormToolbar({
    operationType: 'purchase_order',
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
    whatsappMeta: {
      supplierPhone: supplierPhoneFromMaster(
        masterData.suppliers,
        (existing?.supplierId as string) || form.supplierId
      ),
      partyName: masterData.suppliers.find(
        (s) => s.id === ((existing?.supplierId as string) || form.supplierId)
      )?.nameAr,
      totalAmount: total,
      currency:
        masterData.currencies.find((c) => c.id === form.currencyId) ??
        (existing?.currency as { symbol?: string; code?: string }),
    },
  });

  return (
    <>
      <Header
        title={isNew ? 'أمر شراء جديد' : `أمر شراء ${existing?.documentNo}`}
        subtitle="APST005"
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
                <div className="mb-4 space-y-4">
                  {defaultComparisonId && defaultComparison && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                      تم إنزال البيانات من المقارنة الفنية {defaultComparison.documentNo}
                    </div>
                  )}
                  {approvedComparisons.length > 0 && (
                    <div>
                      <label className="form-label">المقارنة الفنية</label>
                      <select
                        className="form-input"
                        value={form.technicalComparisonId}
                        onChange={(e) => handleComparisonChange(e.target.value)}
                      >
                        <option value="">-- اختر من المقارنة --</option>
                        {approvedComparisons.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.documentNo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {approvedNominations.length > 0 && (
                    <div>
                      <label className="form-label">ترشيح المورد</label>
                      <select
                        className="form-input"
                        value={form.supplierNominationId}
                        onChange={(e) => handleNominationChange(e.target.value)}
                      >
                        <option value="">-- اختر من الترشيح --</option>
                        {approvedNominations.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.documentNo} - {n.supplier?.nameAr || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">المورد *</label>
                  <MasterDataSelect
                    kind="supplier"
                    value={form.supplierId}
                    onChange={(supplierId) => {
                      const supplier = masterData.suppliers.find((s) => s.id === supplierId);
                      const currencyId = resolveCurrencyOnSupplierChange(supplier, form.currencyId);
                      setForm({ ...form, supplierId, currencyId });
                    }}
                    options={masterData.suppliers}
                    disabled={!effectiveEditable}
                    allowEmpty={false}
                  />
                </div>
                <div>
                  <label className="form-label">العملة</label>
                  <MasterDataSelect
                    kind="currency"
                    value={form.currencyId}
                    onChange={(currencyId) => setForm({ ...form, currencyId })}
                    options={supplierCurrencyOptions.length ? supplierCurrencyOptions : masterData.currencies}
                    disabled={!effectiveEditable}
                    allowEmpty={false}
                  />
                </div>
                <div>
                  <label className="form-label">المخزن</label>
                  <MasterDataSelect
                    kind="warehouse"
                    value={form.warehouseId}
                    onChange={(warehouseId) => setForm({ ...form, warehouseId })}
                    options={masterData.warehouses}
                    disabled={!effectiveEditable}
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
                  <label className="form-label">تاريخ الوصول المتوقع</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.expectedArrival}
                    disabled={!effectiveEditable}
                    onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
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
              listHref="/purchases/orders"
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
                  الأمر معتمد. يمكن إنشاء{' '}
                  <a href={`/purchases/inspections/new?orderId=${existing.id}`} className="font-bold underline">
                    فحص مشتريات
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

          <div className="lg:col-span-3">
            <div className="card">
              <h2 className="font-semibold mb-4">الأصناف</h2>
              <ItemsGrid
                items={form.items}
                onChange={(items) => setForm({ ...form, items })}
                availableItems={masterData.items}
                readOnly={!effectiveEditable}
                warehouseId={form.warehouseId || undefined}
              />
              <div className="mt-4 text-left font-bold">الإجمالي: {formatCurrency(total)}</div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
