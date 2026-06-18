'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { ListSearchAutocomplete } from '@/components/ui/ListSearchAutocomplete';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { saveSupplier, setSupplierActive } from '@/actions/master-data';
import type { AutocompleteOption } from '@/lib/autocomplete';

interface SupplierCurrencyRow {
  currencyId: string;
  isDefault: boolean;
  currency?: { nameAr: string; code: string } | null;
}

interface SupplierRow {
  id: string;
  code: string;
  nameAr: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNo?: string | null;
  defaultCurrencyId?: string | null;
  defaultCurrency?: { nameAr: string; code: string } | null;
  currencies?: SupplierCurrencyRow[];
  isActive: boolean;
}

function supplierCurrencyIdsFromRow(row: SupplierRow, fallbackCurrencyId: string): string[] {
  const fromJunction = row.currencies?.map((c) => c.currencyId) ?? [];
  if (fromJunction.length > 0) return fromJunction;
  if (row.defaultCurrencyId) return [row.defaultCurrencyId];
  return fallbackCurrencyId ? [fallbackCurrencyId] : [];
}

export function SuppliersSettingsClient({
  initialData,
  currencies,
}: {
  initialData: SupplierRow[];
  currencies: Array<{ id: string; code: string; nameAr: string }>;
}) {
  const [rows, setRows] = useState(initialData);
  const [search, setSearch] = useState('');
  const defaultFirstCurrencyId = currencies[0]?.id || '';
  const [form, setForm] = useState({
    code: '',
    nameAr: '',
    phone: '',
    email: '',
    address: '',
    taxNo: '',
    currencyIds: defaultFirstCurrencyId ? [defaultFirstCurrencyId] : [] as string[],
    defaultCurrencyId: defaultFirstCurrencyId,
    openingBalance: 0,
    notes: '',
    isActive: true,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.code.includes(search) ||
      r.nameAr.includes(search) ||
      (r.phone || '').includes(search)
  );

  const searchOptions = useMemo<AutocompleteOption[]>(
    () =>
      rows.map((row) => ({
        value: row.id,
        label: `${row.code} - ${row.nameAr}`,
        sublabel: row.phone ? `هاتف: ${row.phone}` : undefined,
        filterText: [row.code, row.nameAr, row.phone].filter(Boolean).join(' '),
        keywords: [row.code, row.nameAr, row.phone, row.email].filter(Boolean).join(' '),
      })),
    [rows]
  );

  const toggleCurrency = (currencyId: string, checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        const currencyIds = prev.currencyIds.includes(currencyId)
          ? prev.currencyIds
          : [...prev.currencyIds, currencyId];
        const defaultCurrencyId = prev.defaultCurrencyId || currencyId;
        return { ...prev, currencyIds, defaultCurrencyId };
      }

      const currencyIds = prev.currencyIds.filter((id) => id !== currencyId);
      const defaultCurrencyId =
        prev.defaultCurrencyId === currencyId ? currencyIds[0] || '' : prev.defaultCurrencyId;
      return { ...prev, currencyIds, defaultCurrencyId };
    });
  };

  const resetForm = () => {
    setForm({
      code: '',
      nameAr: '',
      phone: '',
      email: '',
      address: '',
      taxNo: '',
      currencyIds: defaultFirstCurrencyId ? [defaultFirstCurrencyId] : [],
      defaultCurrencyId: defaultFirstCurrencyId,
      openingBalance: 0,
      notes: '',
      isActive: true,
    });
  };

  const handleSave = async () => {
    if (form.currencyIds.length === 0) {
      setError('يجب اختيار عملة واحدة على الأقل');
      return;
    }
    if (!form.currencyIds.includes(form.defaultCurrencyId)) {
      setError('العملة الافتراضية يجب أن تكون من العملات المختارة');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const saved = await saveSupplier(form, editId || undefined);
      if (editId) {
        setRows((prev) => prev.map((r) => (r.id === editId ? { ...r, ...saved } : r)));
      } else {
        setRows((prev) => [...prev, saved as SupplierRow]);
      }
      setEditId(null);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const formatSupplierCurrencies = (row: SupplierRow) => {
    const ids = supplierCurrencyIdsFromRow(row, '');
    if (ids.length === 0) return row.defaultCurrency?.nameAr || '-';
    const labels = ids.map((id) => {
      const link = row.currencies?.find((c) => c.currencyId === id);
      const cur = link?.currency ?? currencies.find((c) => c.id === id);
      const name = cur?.nameAr || id;
      const isDefault = link?.isDefault || row.defaultCurrencyId === id;
      return isDefault ? `${name} (افتراضي)` : name;
    });
    return labels.join(' · ');
  };

  const columns = [
    { key: 'code', label: 'الكود' },
    { key: 'nameAr', label: 'الاسم' },
    {
      key: 'currencies',
      label: 'العملات',
      render: (row: Record<string, unknown>) =>
        formatSupplierCurrencies(row as unknown as SupplierRow),
    },
    { key: 'phone', label: 'الهاتف' },
    {
      key: 'isActive',
      label: 'الحالة',
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={(row.isActive as boolean) ? 'Approved' : 'Cancelled'} />
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="text-primary-600 text-xs"
            onClick={() => {
              const s = row as unknown as SupplierRow;
              const currencyIds = supplierCurrencyIdsFromRow(s, defaultFirstCurrencyId);
              setEditId(s.id);
              setForm({
                code: s.code,
                nameAr: s.nameAr,
                phone: s.phone || '',
                email: s.email || '',
                address: s.address || '',
                taxNo: s.taxNo || '',
                currencyIds,
                defaultCurrencyId: s.defaultCurrencyId || currencyIds[0] || defaultFirstCurrencyId,
                openingBalance: 0,
                notes: '',
                isActive: s.isActive,
              });
            }}
          >
            تعديل
          </button>
          <button
            type="button"
            className="text-gray-600 text-xs"
            onClick={async () => {
              const s = row as unknown as SupplierRow;
              await setSupplierActive(s.id, !s.isActive);
              setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, isActive: !r.isActive } : r)));
            }}
          >
            {(row.isActive as boolean) ? 'تعطيل' : 'تفعيل'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="إدارة الموردين" subtitle="بيانات الموردين وعملاتهم الافتراضية" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <ListSearchAutocomplete
          className="mb-4"
          value={search}
          onChange={setSearch}
          options={searchOptions}
          placeholder="بحث بالكود أو الاسم أو الهاتف..."
        />

        <div className="card mb-6">
          <h3 className="font-semibold mb-4">{editId ? 'تعديل مورد' : 'إضافة مورد'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="form-input" placeholder="الكود *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="form-input" placeholder="الاسم *" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <input className="form-input" placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="form-input" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="form-input" placeholder="الرقم الضريبي" value={form.taxNo} onChange={(e) => setForm({ ...form, taxNo: e.target.value })} />
            <input className="form-input" placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="mt-4">
            <label className="form-label">العملات المرتبطة *</label>
            <p className="text-xs text-gray-500 mb-2">اختر العملات ثم حدد الافتراضية بالدائرة</p>
            <div className="flex flex-wrap gap-4">
              {currencies.map((c) => {
                const selected = form.currencyIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 ${selected ? 'border-primary-300 bg-primary-50' : 'border-gray-200'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => toggleCurrency(c.id, e.target.checked)}
                    />
                    <input
                      type="radio"
                      name="defaultCurrency"
                      title="عملة افتراضية"
                      checked={form.defaultCurrencyId === c.id}
                      disabled={!selected}
                      onChange={() => setForm((prev) => ({ ...prev, defaultCurrencyId: c.id }))}
                    />
                    <span>{c.nameAr} ({c.code})</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="button" className="btn-primary mt-4" disabled={loading} onClick={handleSave}>
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>

        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} />
      </PageContainer>
    </>
  );
}
