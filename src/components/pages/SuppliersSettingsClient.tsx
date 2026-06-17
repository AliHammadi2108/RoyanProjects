'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { SearchBox } from '@/components/ui/SearchBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { saveSupplier, setSupplierActive } from '@/actions/master-data';

interface SupplierRow {
  id: string;
  code: string;
  nameAr: string;
  phone?: string | null;
  email?: string | null;
  defaultCurrencyId?: string | null;
  defaultCurrency?: { nameAr: string; code: string } | null;
  isActive: boolean;
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
  const [form, setForm] = useState({
    code: '',
    nameAr: '',
    phone: '',
    email: '',
    address: '',
    taxNo: '',
    defaultCurrencyId: currencies[0]?.id || '',
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

  const handleSave = async () => {
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
      setForm({
        code: '',
        nameAr: '',
        phone: '',
        email: '',
        address: '',
        taxNo: '',
        defaultCurrencyId: currencies[0]?.id || '',
        openingBalance: 0,
        notes: '',
        isActive: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'code', label: 'الكود' },
    { key: 'nameAr', label: 'الاسم' },
    {
      key: 'defaultCurrency',
      label: 'العملة',
      render: (row: Record<string, unknown>) =>
        (row.defaultCurrency as { nameAr: string })?.nameAr || '-',
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
              setEditId(s.id);
              setForm({
                code: s.code,
                nameAr: s.nameAr,
                phone: s.phone || '',
                email: s.email || '',
                address: '',
                taxNo: '',
                defaultCurrencyId: s.defaultCurrencyId || currencies[0]?.id || '',
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
        <SearchBox
          className="mb-4"
          value={search}
          onChange={setSearch}
          placeholder="بحث بالكود أو الاسم أو الهاتف..."
        />

        <div className="card mb-6">
          <h3 className="font-semibold mb-4">{editId ? 'تعديل مورد' : 'إضافة مورد'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="form-input" placeholder="الكود *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="form-input" placeholder="الاسم *" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <select className="form-input" value={form.defaultCurrencyId} onChange={(e) => setForm({ ...form, defaultCurrencyId: e.target.value })}>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr} ({c.code})</option>
              ))}
            </select>
            <input className="form-input" placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="form-input" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="form-input" placeholder="الرقم الضريبي" value={form.taxNo} onChange={(e) => setForm({ ...form, taxNo: e.target.value })} />
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
