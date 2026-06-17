'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { OperationToolbar } from '@/components/ui/OperationToolbar';
import { DocumentFormFooter } from '@/components/ui/DocumentFormActions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useOperationFormToolbar } from '@/hooks/useOperationFormToolbar';
import {
  saveSupplierPayment,
  fetchOpenInvoicesForSupplier,
  removeSupplierPayment,
  submitSupplierPayment,
  postSupplierPayment,
  cancelSupplierPayment,
} from '@/actions/supplier-payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { normalizePaymentMethod } from '@/lib/constants';
import { PaymentMethodSelect } from '@/components/ui/PaymentMethodSelect';
import type { MasterData } from '@/types/master-data';

interface AllocationRow {
  invoiceId: string;
  documentNo: string;
  netTotal: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string | null;
  selected: boolean;
  allocatedAmount: number;
}

interface SupplierPaymentFormProps {
  masterData: MasterData;
  existing?: Record<string, unknown>;
  isNew?: boolean;
  canViewAmounts?: boolean;
  userPermissions?: string[];
}

export function SupplierPaymentForm({
  masterData,
  existing,
  isNew,
  canViewAmounts = true,
  userPermissions = [],
}: SupplierPaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState<AllocationRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const status = existing?.status as string | undefined;
  const isEditable = isNew || status === 'Draft' || status === 'Returned For Edit';

  const [form, setForm] = useState({
    branchId: (existing?.branchId as string) || masterData.branches[0]?.id || '',
    supplierId: (existing?.supplierId as string) || '',
    currencyId: (existing?.currencyId as string) || '',
    exchangeRate: (existing?.exchangeRate as number) || 1,
    paymentDate: existing?.paymentDate
      ? new Date(existing.paymentDate as string).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    paymentMethod: normalizePaymentMethod(existing?.paymentMethod as string),
    bankReference: (existing?.bankReference as string) || '',
    notes: (existing?.notes as string) || '',
    totalAmount: (existing?.totalAmount as number) || 0,
  });

  useEffect(() => {
    if (!form.supplierId || !isEditable) return;
    setLoadingInvoices(true);
    fetchOpenInvoicesForSupplier(form.supplierId)
      .then((open) => {
        const existingAllocs = (existing?.allocations as Array<{
          invoiceId: string;
          allocatedAmount: number;
          invoice: { documentNo: string; netTotal: number; paidAmount: number; remainingAmount: number; dueDate?: string };
        }>) || [];

        const rows: AllocationRow[] = open.map((inv) => {
          const prev = existingAllocs.find((a) => a.invoiceId === inv.id);
          return {
            invoiceId: inv.id,
            documentNo: inv.documentNo,
            netTotal: inv.netTotal,
            paidAmount: inv.paidAmount,
            remainingAmount: inv.remainingAmount,
            dueDate: inv.dueDate as string | null,
            selected: !!prev,
            allocatedAmount: prev?.allocatedAmount ?? 0,
          };
        });

        for (const alloc of existingAllocs) {
          if (!rows.find((r) => r.invoiceId === alloc.invoiceId)) {
            rows.push({
              invoiceId: alloc.invoiceId,
              documentNo: alloc.invoice.documentNo,
              netTotal: alloc.invoice.netTotal,
              paidAmount: alloc.invoice.paidAmount,
              remainingAmount: alloc.invoice.remainingAmount,
              dueDate: alloc.invoice.dueDate,
              selected: true,
              allocatedAmount: alloc.allocatedAmount,
            });
          }
        }

        setInvoices(rows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'فشل تحميل الفواتير'))
      .finally(() => setLoadingInvoices(false));
  }, [form.supplierId, isEditable, existing?.allocations]);

  const selectedTotal = useMemo(
    () => invoices.filter((i) => i.selected).reduce((s, i) => s + i.allocatedAmount, 0),
    [invoices]
  );

  const toggleInvoice = (invoiceId: string, checked: boolean) => {
    setInvoices((rows) =>
      rows.map((r) =>
        r.invoiceId === invoiceId
          ? {
              ...r,
              selected: checked,
              allocatedAmount: checked && r.allocatedAmount <= 0 ? r.remainingAmount : r.allocatedAmount,
            }
          : r
      )
    );
  };

  const payFull = (invoiceId: string) => {
    setInvoices((rows) =>
      rows.map((r) =>
        r.invoiceId === invoiceId
          ? { ...r, selected: true, allocatedAmount: r.remainingAmount }
          : r
      )
    );
  };

  const distributeAmount = () => {
    if (form.totalAmount <= 0) return;
    let remaining = form.totalAmount;
    setInvoices((rows) =>
      rows.map((r) => {
        if (!r.selected || remaining <= 0) return { ...r, allocatedAmount: 0 };
        const alloc = Math.min(r.remainingAmount, remaining);
        remaining -= alloc;
        return { ...r, allocatedAmount: alloc };
      })
    );
  };

  const updateAllocation = (invoiceId: string, amount: number) => {
    setInvoices((rows) =>
      rows.map((r) =>
        r.invoiceId === invoiceId ? { ...r, allocatedAmount: amount, selected: amount > 0 } : r
      )
    );
  };

  const buildPayload = () => ({
    ...form,
    currencyId: form.currencyId || null,
    totalAmount: form.totalAmount || selectedTotal,
    allocations: invoices
      .filter((i) => i.selected && i.allocatedAmount > 0)
      .map((i) => ({ invoiceId: i.invoiceId, allocatedAmount: i.allocatedAmount })),
  });

  const handleSave = async (submit = false) => {
    setLoading(true);
    setError('');
    try {
      const payload = buildPayload();
      if (payload.allocations.length === 0) {
        throw new Error('يجب تخصيص مبلغ على فاتورة واحدة على الأقل');
      }
      const result = await saveSupplierPayment(payload, existing?.id as string | undefined);
      if (submit && result.id) {
        await submitSupplierPayment(result.id);
      }
      router.push(`/purchases/supplier-payments/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id) return;
    if (!confirm(`حذف سند الصرف ${existing.documentNo}؟`)) return;
    setLoading(true);
    try {
      await removeSupplierPayment(existing.id as string);
      router.push('/purchases/supplier-payments');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!existing?.id) return;
    if (!confirm('ترحيل السند وتحديث أرصدة الفواتير؟')) return;
    setLoading(true);
    try {
      await postSupplierPayment(existing.id as string);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الترحيل');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!existing?.id) return;
    if (!confirm('إلغاء سند الصرف؟')) return;
    setLoading(true);
    try {
      await cancelSupplierPayment(existing.id as string);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإلغاء');
    } finally {
      setLoading(false);
    }
  };

  const { toolbarProps } = useOperationFormToolbar({
    operationType: 'supplier_payment',
    isNew,
    existing,
    loading,
    userPermissions,
    status,
    onSave: handleSave,
    onSubmitOnly: () => handleSave(true),
  });

  return (
    <>
      <Header
        title={isNew ? 'سند صرف مورد جديد' : `سند صرف ${existing?.documentNo as string}`}
        subtitle="تخصيص المدفوعات على فواتير المورد"
        actions={
          !isNew && status ? <StatusBadge status={status} /> : undefined
        }
      />
      <PageContainer>
        <OperationToolbar {...toolbarProps} />

        {error ? (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        ) : null}

        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="form-label">الفرع</label>
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
              <label className="form-label">المورد</label>
              <select
                className="form-input"
                value={form.supplierId}
                disabled={!isEditable || !isNew}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value, currencyId: '' })}
              >
                <option value="">اختر مورداً...</option>
                {masterData.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} - {s.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">تاريخ الدفع</label>
              <input
                type="date"
                className="form-input"
                value={form.paymentDate}
                disabled={!isEditable}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">العملة</label>
              <select
                className="form-input"
                value={form.currencyId}
                disabled={!isEditable}
                onChange={(e) => {
                  const cur = masterData.currencies.find((c) => c.id === e.target.value);
                  setForm({
                    ...form,
                    currencyId: e.target.value,
                    exchangeRate: cur?.rateToBase || 1,
                  });
                }}
              >
                <option value="">افتراضي المورد</option>
                {masterData.currencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">سعر الصرف</label>
              <input
                type="number"
                step="0.0001"
                className="form-input"
                value={form.exchangeRate}
                disabled={!isEditable}
                onChange={(e) => setForm({ ...form, exchangeRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="form-label">مبلغ السند</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={form.totalAmount || ''}
                disabled={!isEditable || !canViewAmounts}
                onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="form-label">طريقة الدفع</label>
              <PaymentMethodSelect
                value={form.paymentMethod}
                disabled={!isEditable}
                onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
              />
            </div>
            <div>
              <label className="form-label">مرجع بنكي</label>
              <input
                className="form-input"
                value={form.bankReference}
                disabled={!isEditable}
                onChange={(e) => setForm({ ...form, bankReference: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="form-label">ملاحظات</label>
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

        <div className="card p-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold">تخصيص الفواتير</h3>
            {isEditable ? (
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-sm" onClick={distributeAmount}>
                  توزيع المبلغ
                </button>
                <span className="text-sm text-gray-600 py-2">
                  المخصص: {canViewAmounts ? formatCurrency(selectedTotal) : '—'}
                </span>
              </div>
            ) : null}
          </div>

          {loadingInvoices ? (
            <p className="text-sm text-gray-500">جاري تحميل الفواتير...</p>
          ) : !form.supplierId ? (
            <p className="text-sm text-gray-500">اختر مورداً لعرض الفواتير المفتوحة.</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد فواتير مفتوحة لهذا المورد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr>
                    {isEditable ? <th className="w-10" /> : null}
                    <th>رقم الفاتورة</th>
                    <th>الاستحقاق</th>
                    {canViewAmounts ? (
                      <>
                        <th>الإجمالي</th>
                        <th>المدفوع</th>
                        <th>المتبقي</th>
                        <th>مبلغ التخصيص</th>
                      </>
                    ) : null}
                    {isEditable ? <th>إجراء</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((row) => (
                    <tr key={row.invoiceId}>
                      {isEditable ? (
                        <td>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => toggleInvoice(row.invoiceId, e.target.checked)}
                          />
                        </td>
                      ) : null}
                      <td>
                        <Link href={`/purchases/invoices/${row.invoiceId}`} className="text-primary-600 hover:underline">
                          {row.documentNo}
                        </Link>
                      </td>
                      <td>{row.dueDate ? formatDate(row.dueDate) : '-'}</td>
                      {canViewAmounts ? (
                        <>
                          <td>{formatCurrency(row.netTotal)}</td>
                          <td>{formatCurrency(row.paidAmount)}</td>
                          <td>{formatCurrency(row.remainingAmount)}</td>
                          <td>
                            {isEditable ? (
                              <input
                                type="number"
                                step="0.01"
                                className="form-input w-28"
                                value={row.allocatedAmount || ''}
                                onChange={(e) => updateAllocation(row.invoiceId, Number(e.target.value))}
                              />
                            ) : (
                              formatCurrency(row.allocatedAmount)
                            )}
                          </td>
                        </>
                      ) : null}
                      {isEditable ? (
                        <td>
                          <button type="button" className="text-primary-600 text-xs hover:underline" onClick={() => payFull(row.invoiceId)}>
                            دفع كامل
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isNew && status === 'Approved' && userPermissions.includes('supplier_payment.post') ? (
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary" disabled={loading} onClick={handlePost}>
              ترحيل السند
            </button>
          </div>
        ) : null}

        {!isNew && (status === 'Draft' || status === 'Pending Approval') && userPermissions.includes('supplier_payment.cancel') ? (
          <div className="mt-2">
            <button type="button" className="btn-secondary text-sm" disabled={loading} onClick={handleCancel}>
              إلغاء السند
            </button>
          </div>
        ) : null}

        <DocumentFormFooter
          listHref="/purchases/supplier-payments"
          isEditable={!!isEditable}
          onDelete={existing?.id && status === 'Draft' ? handleDelete : undefined}
          hideActions
          hideReadOnlyMessage
        />
      </PageContainer>
    </>
  );
}
