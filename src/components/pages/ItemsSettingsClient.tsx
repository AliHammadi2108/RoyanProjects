'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { saveItem, setItemActive } from '@/actions/master-data';
import { Plus, Trash2 } from 'lucide-react';

interface ItemUnitRow {
  unitId: string;
  isBase: boolean;
  factorToBase: number;
  barcode?: string;
  purchasePrice?: number;
  salePrice?: number;
  isDefaultPurchase: boolean;
  isDefaultSale: boolean;
  isActive: boolean;
}

interface ItemRow {
  id: string;
  code: string;
  nameAr: string;
  barcode?: string | null;
  isActive: boolean;
  itemUnits?: Array<ItemUnitRow & { unit?: { nameAr: string } }>;
}

export function ItemsSettingsClient({
  initialData,
  units,
}: {
  initialData: ItemRow[];
  units: Array<{ id: string; code: string; nameAr: string }>;
}) {
  const [rows, setRows] = useState(initialData);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    code: '',
    nameAr: '',
    barcode: '',
    description: '',
    isStockItem: true,
    isActive: true,
    itemUnits: [
      {
        unitId: units[0]?.id || '',
        isBase: true,
        factorToBase: 1,
        isDefaultPurchase: true,
        isDefaultSale: true,
        isActive: true,
      },
    ] as ItemUnitRow[],
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = rows.filter(
    (r) => !search || r.code.includes(search) || r.nameAr.includes(search) || (r.barcode || '').includes(search)
  );

  const addUnitRow = () => {
    setForm({
      ...form,
      itemUnits: [
        ...form.itemUnits,
        {
          unitId: units[0]?.id || '',
          isBase: false,
          factorToBase: 1,
          isDefaultPurchase: false,
          isDefaultSale: false,
          isActive: true,
        },
      ],
    });
  };

  const updateUnitRow = (idx: number, patch: Partial<ItemUnitRow>) => {
    const itemUnits = form.itemUnits.map((u, i) => {
      if (i !== idx) {
        if (patch.isBase) return { ...u, isBase: false, factorToBase: u.isBase ? u.factorToBase : u.factorToBase };
        return u;
      }
      const next = { ...u, ...patch };
      if (patch.isBase) next.factorToBase = 1;
      return next;
    });
    setForm({ ...form, itemUnits });
  };

  const removeUnitRow = (idx: number) => {
    if (form.itemUnits.length <= 1) return;
    setForm({ ...form, itemUnits: form.itemUnits.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    setError('');
    try {
      const saved = await saveItem(form, editId || undefined);
      if (editId) {
        setRows((prev) => prev.map((r) => (r.id === editId ? { ...r, ...(saved as ItemRow) } : r)));
      } else if (saved) {
        setRows((prev) => [...prev, saved as ItemRow]);
      }
      setEditId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  const columns = [
    { key: 'code', label: 'الكود' },
    { key: 'nameAr', label: 'الاسم' },
    {
      key: 'itemUnits',
      label: 'الوحدات',
      render: (row: Record<string, unknown>) => {
        const ius = row.itemUnits as ItemRow['itemUnits'];
        return ius?.map((u) => u.unit?.nameAr).filter(Boolean).join('، ') || '-';
      },
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
          <button type="button" className="text-primary-600 text-xs" onClick={() => {
            const item = row as unknown as ItemRow;
            setEditId(item.id);
            setForm({
              code: item.code,
              nameAr: item.nameAr,
              barcode: item.barcode || '',
              description: '',
              isStockItem: true,
              isActive: item.isActive,
              itemUnits: (item.itemUnits || []).map((u) => ({
                unitId: u.unitId,
                isBase: u.isBase,
                factorToBase: u.factorToBase,
                barcode: u.barcode,
                purchasePrice: u.purchasePrice,
                salePrice: u.salePrice,
                isDefaultPurchase: u.isDefaultPurchase,
                isDefaultSale: u.isDefaultSale,
                isActive: u.isActive,
              })),
            });
          }}>تعديل</button>
          <button type="button" className="text-gray-600 text-xs" onClick={async () => {
            const item = row as unknown as ItemRow;
            await setItemActive(item.id, !item.isActive);
            setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, isActive: !r.isActive } : r)));
          }}>{(row.isActive as boolean) ? 'تعطيل' : 'تفعيل'}</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="إدارة الأصناف" subtitle="الأصناف ووحداتها المتعددة" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <input className="form-input mb-4 max-w-md" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="card mb-6 space-y-4">
          <h3 className="font-semibold">{editId ? 'تعديل صنف' : 'إضافة صنف'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="form-input" placeholder="الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="form-input" placeholder="الاسم" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            <input className="form-input" placeholder="الباركود" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">وحدات الصنف</h4>
              <button type="button" className="btn-secondary text-xs" onClick={addUnitRow}>
                <Plus className="w-3 h-3" /> وحدة
              </button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-right">الوحدة</th>
                    <th className="px-2 py-2 text-right">أساسية</th>
                    <th className="px-2 py-2 text-right">المعامل</th>
                    <th className="px-2 py-2 text-right">شراء افتراضي</th>
                    <th className="px-2 py-2 text-right">بيع افتراضي</th>
                    <th className="px-2 py-2 text-right">سعر شراء</th>
                    <th className="px-2 py-2 text-right">سعر بيع</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.itemUnits.map((iu, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2">
                        <select className="form-input text-xs" value={iu.unitId} onChange={(e) => updateUnitRow(idx, { unitId: e.target.value })}>
                          {units.map((u) => <option key={u.id} value={u.id}>{u.nameAr}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="radio" name="baseUnit" checked={iu.isBase} onChange={() => updateUnitRow(idx, { isBase: true })} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" className="form-input text-xs w-20" disabled={iu.isBase} value={iu.factorToBase}
                          onChange={(e) => updateUnitRow(idx, { factorToBase: parseFloat(e.target.value) || 1 })} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" checked={iu.isDefaultPurchase} onChange={(e) => updateUnitRow(idx, { isDefaultPurchase: e.target.checked })} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox" checked={iu.isDefaultSale} onChange={(e) => updateUnitRow(idx, { isDefaultSale: e.target.checked })} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" className="form-input text-xs w-24" value={iu.purchasePrice ?? ''}
                          onChange={(e) => updateUnitRow(idx, { purchasePrice: parseFloat(e.target.value) || undefined })} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" className="form-input text-xs w-24" value={iu.salePrice ?? ''}
                          onChange={(e) => updateUnitRow(idx, { salePrice: parseFloat(e.target.value) || undefined })} />
                      </td>
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => removeUnitRow(idx)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={handleSave}>حفظ الصنف</button>
        </div>

        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} />
      </PageContainer>
    </>
  );
}
