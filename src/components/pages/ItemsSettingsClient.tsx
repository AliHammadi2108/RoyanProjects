'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListSearchAutocomplete, SearchEmptyState } from '@/components/ui/ListSearchAutocomplete';
import { MasterDataSelect } from '@/components/ui/MasterDataSelect';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';
import type { AutocompleteOption } from '@/lib/autocomplete';
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

interface ItemWarehouseReorderRow {
  warehouseId: string;
  reorderLevelBaseQty?: number;
  reorderQtyBase?: number;
  enableReorderAlert: boolean;
  warehouse?: { id: string; code: string; nameAr: string };
}

interface ItemRow {
  id: string;
  code: string;
  nameAr: string;
  barcode?: string | null;
  isActive: boolean;
  reorderLevelBaseQty?: number | null;
  reorderQtyBase?: number | null;
  preferredSupplierId?: string | null;
  enableReorderAlert?: boolean;
  itemUnits?: Array<ItemUnitRow & { unit?: { nameAr: string } }>;
  itemWarehouseReorders?: ItemWarehouseReorderRow[];
  preferredSupplier?: { id: string; nameAr: string } | null;
}

export function ItemsSettingsClient({
  initialData,
  units,
  suppliers,
  warehouses,
  canEditReorder = false,
}: {
  initialData: ItemRow[];
  units: Array<{ id: string; code: string; nameAr: string }>;
  suppliers: Array<{ id: string; code: string; nameAr: string }>;
  warehouses: Array<{ id: string; code: string; nameAr: string }>;
  canEditReorder?: boolean;
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
    reorderLevelBaseQty: undefined as number | undefined,
    reorderQtyBase: undefined as number | undefined,
    preferredSupplierId: '',
    enableReorderAlert: false,
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
    itemWarehouseReorders: [] as ItemWarehouseReorderRow[],
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => clientSearchMapped(rows as unknown as Record<string, unknown>[], search, SEARCH_MAPPINGS.item),
    [rows, search]
  );

  const searchOptions = useMemo<AutocompleteOption[]>(
    () =>
      rows.map((row) => ({
        value: row.id,
        label: `${row.code} - ${row.nameAr}`,
        sublabel: row.barcode ? `باركود: ${row.barcode}` : undefined,
        filterText: [row.code, row.nameAr, row.barcode].filter(Boolean).join(' '),
        keywords: [row.code, row.nameAr, row.barcode].filter(Boolean).join(' '),
      })),
    [rows]
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

  const baseUnitName = units.find((u) => u.id === form.itemUnits.find((iu) => iu.isBase)?.unitId)?.nameAr || 'الوحدة الأساسية';

  const addWarehouseReorderRow = () => {
    const used = new Set(form.itemWarehouseReorders.map((w) => w.warehouseId));
    const nextWh = warehouses.find((w) => !used.has(w.id));
    if (!nextWh) return;
    setForm({
      ...form,
      itemWarehouseReorders: [
        ...form.itemWarehouseReorders,
        { warehouseId: nextWh.id, enableReorderAlert: false },
      ],
    });
  };

  const updateWarehouseReorderRow = (idx: number, patch: Partial<ItemWarehouseReorderRow>) => {
    setForm({
      ...form,
      itemWarehouseReorders: form.itemWarehouseReorders.map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    });
  };

  const removeWarehouseReorderRow = (idx: number) => {
    setForm({
      ...form,
      itemWarehouseReorders: form.itemWarehouseReorders.filter((_, i) => i !== idx),
    });
  };

  const resetForm = () => ({
    code: '',
    nameAr: '',
    barcode: '',
    description: '',
    isStockItem: true,
    isActive: true,
    reorderLevelBaseQty: undefined,
    reorderQtyBase: undefined,
    preferredSupplierId: '',
    enableReorderAlert: false,
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
    itemWarehouseReorders: [] as ItemWarehouseReorderRow[],
  });

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
      setForm(resetForm());
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
              reorderLevelBaseQty: item.reorderLevelBaseQty ?? undefined,
              reorderQtyBase: item.reorderQtyBase ?? undefined,
              preferredSupplierId: item.preferredSupplierId || item.preferredSupplier?.id || '',
              enableReorderAlert: item.enableReorderAlert ?? false,
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
              itemWarehouseReorders: (item.itemWarehouseReorders || []).map((w) => ({
                warehouseId: w.warehouseId,
                reorderLevelBaseQty: w.reorderLevelBaseQty ?? undefined,
                reorderQtyBase: w.reorderQtyBase ?? undefined,
                enableReorderAlert: w.enableReorderAlert,
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
        <div className="card mb-4">
          <ListSearchAutocomplete
            value={search}
            onChange={setSearch}
            options={searchOptions}
            placeholder="بحث بالكود أو الاسم أو الباركود..."
          />
        </div>

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

          {canEditReorder && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50/50">
              <h4 className="font-medium text-sm">حد الطلب / إعادة الطلب</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">حد الطلب ({baseUnitName})</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={form.reorderLevelBaseQty ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reorderLevelBaseQty: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">كمية إعادة الطلب ({baseUnitName})</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={form.reorderQtyBase ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reorderQtyBase: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">المورد المفضل</label>
                  <MasterDataSelect
                    kind="supplier"
                    value={form.preferredSupplierId}
                    onChange={(preferredSupplierId) => setForm({ ...form, preferredSupplierId })}
                    options={suppliers}
                    emptyLabel="—"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.enableReorderAlert}
                      onChange={(e) => setForm({ ...form, enableReorderAlert: e.target.checked })}
                    />
                    تفعيل تنبيه حد الطلب
                  </label>
                </div>
              </div>

              {warehouses.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">إعدادات حسب المخزن</span>
                    <button type="button" className="btn-secondary text-xs" onClick={addWarehouseReorderRow}>
                      <Plus className="w-3 h-3" /> مخزن
                    </button>
                  </div>
                  {form.itemWarehouseReorders.length > 0 && (
                    <div className="overflow-x-auto border rounded-lg bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-right">المخزن</th>
                            <th className="px-2 py-2 text-right">حد الطلب</th>
                            <th className="px-2 py-2 text-right">كمية الطلب</th>
                            <th className="px-2 py-2 text-right">تنبيه</th>
                            <th className="px-2 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.itemWarehouseReorders.map((wr, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-2">
                                <select
                                  className="form-input text-xs"
                                  value={wr.warehouseId}
                                  onChange={(e) => updateWarehouseReorderRow(idx, { warehouseId: e.target.value })}
                                >
                                  {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.nameAr}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  className="form-input text-xs w-24"
                                  value={wr.reorderLevelBaseQty ?? ''}
                                  onChange={(e) =>
                                    updateWarehouseReorderRow(idx, {
                                      reorderLevelBaseQty: e.target.value ? parseFloat(e.target.value) : undefined,
                                    })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  className="form-input text-xs w-24"
                                  value={wr.reorderQtyBase ?? ''}
                                  onChange={(e) =>
                                    updateWarehouseReorderRow(idx, {
                                      reorderQtyBase: e.target.value ? parseFloat(e.target.value) : undefined,
                                    })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={wr.enableReorderAlert}
                                  onChange={(e) =>
                                    updateWarehouseReorderRow(idx, { enableReorderAlert: e.target.checked })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2">
                                <button type="button" onClick={() => removeWarehouseReorderRow(idx)} className="text-red-500">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button type="button" className="btn-primary" onClick={handleSave}>حفظ الصنف</button>
        </div>

        <DataTable columns={columns} data={filtered as unknown as Record<string, unknown>[]} />
      </PageContainer>
    </>
  );
}
