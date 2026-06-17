'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { saveUnit, setUnitActive } from '@/actions/master-data';

interface UnitRow {
  id: string;
  code: string;
  nameAr: string;
  symbol?: string | null;
  isActive: boolean;
}

export function UnitsClient({ initialData }: { initialData: UnitRow[] }) {
  const [rows, setRows] = useState(initialData);
  const [form, setForm] = useState({ code: '', nameAr: '', symbol: '', description: '', isActive: true });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    try {
      const saved = await saveUnit(form, editId || undefined);
      if (editId) {
        setRows((prev) => prev.map((r) => (r.id === editId ? { ...r, ...saved } : r)));
      } else {
        setRows((prev) => [...prev, saved as UnitRow]);
      }
      setEditId(null);
      setForm({ code: '', nameAr: '', symbol: '', description: '', isActive: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  const columns = [
    { key: 'code', label: 'الكود' },
    { key: 'nameAr', label: 'الاسم' },
    { key: 'symbol', label: 'الرمز' },
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
          <button type="button" className="text-primary-600 text-xs" onClick={() => {
            const u = row as unknown as UnitRow;
            setEditId(u.id);
            setForm({ code: u.code, nameAr: u.nameAr, symbol: u.symbol || '', description: '', isActive: u.isActive });
          }}>تعديل</button>
          <button type="button" className="text-gray-600 text-xs" onClick={async () => {
            const u = row as unknown as UnitRow;
            await setUnitActive(u.id, !u.isActive);
            setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, isActive: !r.isActive } : r)));
          }}>{(row.isActive as boolean) ? 'تعطيل' : 'تفعيل'}</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="إدارة الوحدات" subtitle="وحدات القياس" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input className="form-input" placeholder="الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="form-input" placeholder="الاسم" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <input className="form-input" placeholder="الرمز" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <button type="button" className="btn-primary" onClick={handleSave}>حفظ</button>
          </div>
        </div>
        <DataTable columns={columns} data={rows as unknown as Record<string, unknown>[]} />
      </PageContainer>
    </>
  );
}
