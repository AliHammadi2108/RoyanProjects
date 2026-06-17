'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListSearchAutocomplete, SearchEmptyState } from '@/components/ui/ListSearchAutocomplete';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';
import type { AutocompleteOption } from '@/lib/autocomplete';
import { saveCurrency, setCurrencyActive, setBaseCurrency } from '@/actions/master-data';

interface CurrencyRow {
  id: string;
  code: string;
  nameAr: string;
  symbol: string;
  rateToBase: number;
  isBase: boolean;
  isActive: boolean;
}

export function CurrenciesClient({ initialData }: { initialData: CurrencyRow[] }) {
  const [rows, setRows] = useState(initialData);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    code: '',
    nameAr: '',
    symbol: '',
    rateToBase: 1,
    isBase: false,
    isActive: true,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setForm({ code: '', nameAr: '', symbol: '', rateToBase: 1, isBase: false, isActive: true });
    setEditId(null);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const saved = await saveCurrency(form, editId || undefined);
      if (editId) {
        setRows((prev) => prev.map((r) => (r.id === editId ? { ...r, ...saved } : r)));
      } else {
        setRows((prev) => [...prev, saved as CurrencyRow]);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row: CurrencyRow) => {
    setEditId(row.id);
    setForm({
      code: row.code,
      nameAr: row.nameAr,
      symbol: row.symbol,
      rateToBase: row.rateToBase,
      isBase: row.isBase,
      isActive: row.isActive,
    });
  };

  const toggleActive = async (row: CurrencyRow) => {
    try {
      await setCurrencyActive(row.id, !row.isActive);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isActive: !r.isActive } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحديث');
    }
  };

  const makeBase = async (id: string) => {
    try {
      await setBaseCurrency(id);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          isBase: r.id === id,
          rateToBase: r.id === id ? 1 : r.rateToBase,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحديث');
    }
  };

  const filtered = useMemo(
    () => clientSearchMapped(rows as unknown as Record<string, unknown>[], search, SEARCH_MAPPINGS.currency),
    [rows, search]
  );

  const searchOptions = useMemo<AutocompleteOption[]>(
    () =>
      rows.map((row) => ({
        value: row.id,
        label: `${row.code} - ${row.nameAr}`,
        sublabel: row.symbol ? `رمز: ${row.symbol}` : undefined,
        filterText: [row.code, row.nameAr, row.symbol].filter(Boolean).join(' '),
        keywords: [row.code, row.nameAr, row.symbol].filter(Boolean).join(' '),
      })),
    [rows]
  );

  const columns = [
    { key: 'code', label: 'الرمز' },
    { key: 'nameAr', label: 'الاسم' },
    { key: 'symbol', label: 'الرمز المعروض' },
  {
      key: 'rateToBase',
      label: 'سعر التحويل',
      render: (row: Record<string, unknown>) => (row.rateToBase as number).toFixed(4),
    },
    {
      key: 'isBase',
      label: 'أساسية',
      render: (row: Record<string, unknown>) =>
        row.isBase ? (
          <span className="text-green-600 font-medium">نعم</span>
        ) : (
          <button type="button" className="text-primary-600 text-xs" onClick={() => makeBase(row.id as string)}>
            تعيين أساسية
          </button>
        ),
    },
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
          <button type="button" className="text-primary-600 text-xs" onClick={() => handleEdit(row as unknown as CurrencyRow)}>
            تعديل
          </button>
          <button type="button" className="text-gray-600 text-xs" onClick={() => toggleActive(row as unknown as CurrencyRow)}>
            {(row.isActive as boolean) ? 'تعطيل' : 'تفعيل'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="إدارة العملات" subtitle="العملات وأسعار التحويل" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}

        <div className="card mb-6">
          <h3 className="font-semibold mb-4">{editId ? 'تعديل عملة' : 'إضافة عملة'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="form-input" placeholder="الرمز" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="form-input" placeholder="الاسم" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <input className="form-input" placeholder="رمز العرض" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <input type="number" step="0.0001" className="form-input" placeholder="سعر التحويل" value={form.rateToBase}
              disabled={form.isBase} onChange={(e) => setForm({ ...form, rateToBase: parseFloat(e.target.value) || 1 })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              نشطة
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" className="btn-primary" disabled={loading} onClick={handleSave}>
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            {editId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>إلغاء</button>
            )}
          </div>
        </div>

        <div className="card mb-4">
          <ListSearchAutocomplete
            value={search}
            onChange={setSearch}
            options={searchOptions}
            placeholder="بحث بالرمز أو الاسم..."
          />
        </div>
        {filtered.length === 0 ? (
          <div className="card"><SearchEmptyState query={search} /></div>
        ) : (
          <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} />
        )}
      </PageContainer>
    </>
  );
}
