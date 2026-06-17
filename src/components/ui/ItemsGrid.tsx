'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateLineTotal } from '@/lib/utils';
import { calcBaseQty } from '@/lib/item-units';

export interface ItemUnitOption {
  id: string;
  unitId: string;
  factorToBase: number;
  isDefaultPurchase: boolean;
  isDefaultSale: boolean;
  isBase: boolean;
  unit?: { nameAr: string; symbol?: string | null };
}

export interface AvailableItem {
  id: string;
  code: string;
  nameAr: string;
  unitId?: string | null;
  itemUnits?: ItemUnitOption[];
}

export interface LineItem {
  itemId: string;
  itemNameSnapshot: string;
  itemUnitId?: string;
  unitId?: string;
  factorToBase?: number;
  baseQty?: number;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  packaging?: string;
  specs?: string;
}

interface ItemsGridProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  availableItems: AvailableItem[];
  readOnly?: boolean;
  unitMode?: 'purchase' | 'sale';
  showBaseQty?: boolean;
}

function pickDefaultUnit(item: AvailableItem, mode: 'purchase' | 'sale'): ItemUnitOption | undefined {
  const units = item.itemUnits ?? [];
  if (units.length === 0) return undefined;
  const preferred = units.find((u) => (mode === 'purchase' ? u.isDefaultPurchase : u.isDefaultSale));
  if (preferred) return preferred;
  return units.find((u) => u.isBase) ?? units[0];
}

export function ItemsGrid({
  items,
  onChange,
  availableItems,
  readOnly,
  unitMode = 'purchase',
  showBaseQty = true,
}: ItemsGridProps) {
  const emptyRow = (): LineItem => ({
    itemId: '',
    itemNameSnapshot: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    tax: 0,
    total: 0,
    factorToBase: 1,
    baseQty: 1,
  });

  const [rows, setRows] = useState<LineItem[]>(
    items.length > 0 ? items : [emptyRow()]
  );

  useEffect(() => {
    if (items.length > 0) {
      setRows(items);
    }
  }, [items]);

  const updateRows = (newRows: LineItem[]) => {
    setRows(newRows);
    onChange(newRows.filter((r) => r.itemId));
  };

  const addRow = () => {
    updateRows([...rows, emptyRow()]);
  };

  const removeRow = (idx: number) => {
    updateRows(rows.filter((_, i) => i !== idx));
  };

  const applyItemUnit = (row: LineItem, item: AvailableItem, itemUnitId?: string) => {
    const units = item.itemUnits ?? [];
    const iu = itemUnitId
      ? units.find((u) => u.id === itemUnitId)
      : pickDefaultUnit(item, unitMode);
    if (iu) {
      row.itemUnitId = iu.id;
      row.unitId = iu.unitId;
      row.factorToBase = iu.factorToBase;
      row.baseQty = calcBaseQty(row.quantity, iu.factorToBase);
    } else if (item.unitId) {
      row.unitId = item.unitId;
      row.factorToBase = 1;
      row.baseQty = row.quantity;
    }
  };

  const updateRow = (idx: number, field: keyof LineItem, value: string | number) => {
    const newRows = [...rows];
    const row = { ...newRows[idx], [field]: value };

    if (field === 'itemId') {
      const item = availableItems.find((i) => i.id === value);
      if (item) {
        row.itemNameSnapshot = item.nameAr;
        applyItemUnit(row, item);
      }
    }

    if (field === 'itemUnitId') {
      const item = availableItems.find((i) => i.id === row.itemId);
      if (item) applyItemUnit(row, item, value as string);
    }

    if (field === 'quantity') {
      const factor = row.factorToBase ?? 1;
      row.baseQty = calcBaseQty(Number(value) || 0, factor);
    }

    if (['quantity', 'unitPrice', 'discount', 'tax'].includes(field)) {
      row.total = calculateLineTotal(row.quantity, row.unitPrice, row.discount, row.tax);
    }

    newRows[idx] = row;
    updateRows(newRows);
  };

  const getUnitsForRow = (itemId: string) => {
    const item = availableItems.find((i) => i.id === itemId);
    return item?.itemUnits ?? [];
  };

  const grandTotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-right font-medium text-gray-600">الصنف</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">الوحدة</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">الكمية</th>
              {showBaseQty && (
                <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">أساسية</th>
              )}
              <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">سعر الوحدة</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">الخصم</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">الإجمالي</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">البيان</th>
              {!readOnly && <th className="px-3 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => {
              const unitOptions = getUnitsForRow(row.itemId);
              return (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      row.itemNameSnapshot
                    ) : (
                      <select
                        className="form-input text-sm"
                        value={row.itemId}
                        onChange={(e) => updateRow(idx, 'itemId', e.target.value)}
                      >
                        <option value="">اختر صنفاً</option>
                        {availableItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code} - {item.nameAr}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      unitOptions.find((u) => u.id === row.itemUnitId)?.unit?.nameAr || '-'
                    ) : unitOptions.length > 0 ? (
                      <select
                        className="form-input text-sm"
                        value={row.itemUnitId || ''}
                        onChange={(e) => updateRow(idx, 'itemUnitId', e.target.value)}
                        disabled={!row.itemId}
                      >
                        {unitOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.unit?.nameAr}
                            {u.isBase ? ' (أساسية)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? row.quantity : (
                      <input type="number" min="0.01" step="0.01" className="form-input text-sm"
                        value={row.quantity} onChange={(e) => updateRow(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    )}
                  </td>
                  {showBaseQty && (
                    <td className="px-3 py-2 text-gray-500">
                      {(row.baseQty ?? row.quantity).toFixed(2)}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    {readOnly ? row.unitPrice.toFixed(2) : (
                      <input type="number" min="0" step="0.01" className="form-input text-sm"
                        value={row.unitPrice} onChange={(e) => updateRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)} />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? row.discount.toFixed(2) : (
                      <input type="number" min="0" step="0.01" className="form-input text-sm"
                        value={row.discount} onChange={(e) => updateRow(idx, 'discount', parseFloat(e.target.value) || 0)} />
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.total.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {readOnly ? (row.notes || '-') : (
                      <input type="text" className="form-input text-sm"
                        value={row.notes || ''} onChange={(e) => updateRow(idx, 'notes', e.target.value)} />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeRow(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        {!readOnly && (
          <button type="button" onClick={addRow} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" /> إضافة صف
          </button>
        )}
        <div className="text-left font-bold text-lg">
          الإجمالي: {grandTotal.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
