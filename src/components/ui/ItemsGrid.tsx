'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateLineTotal } from '@/lib/utils';
import { calcBaseQty } from '@/lib/item-units';
import { coerceInteger } from '@/lib/integer-stepper';
import { IntegerStepperInput } from '@/components/ui/IntegerStepperInput';
import { AutocompleteSelect } from '@/components/ui/AutocompleteSelect';
import { searchItems } from '@/actions/search';
import type { AutocompleteOption } from '@/lib/autocomplete';

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
  barcode?: string | null;
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
  warehouseId?: string;
  asyncItemSearch?: boolean;
}

function formatUnitLabel(unit: ItemUnitOption): string {
  const name = unit.unit?.nameAr || '';
  return unit.isBase ? `${name} (أساسية)` : name;
}

function pickDefaultUnit(item: AvailableItem, mode: 'purchase' | 'sale'): ItemUnitOption | undefined {
  const units = item.itemUnits ?? [];
  if (units.length === 0) return undefined;
  const preferred = units.find((u) => (mode === 'purchase' ? u.isDefaultPurchase : u.isDefaultSale));
  if (preferred) return preferred;
  return units.find((u) => u.isBase) ?? units[0];
}

function toItemOption(item: AvailableItem, stockBalance?: number | null): AutocompleteOption {
  const sublabel = [
    item.barcode ? `باركود: ${item.barcode}` : null,
    stockBalance != null ? `الرصيد: ${stockBalance.toFixed(2)}` : null,
    item.itemUnits?.find((u) => u.isBase)?.unit?.nameAr
      ? `الوحدة الأساسية: ${item.itemUnits.find((u) => u.isBase)?.unit?.nameAr}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    value: item.id,
    label: `${item.code} - ${item.nameAr}`,
    sublabel: sublabel || undefined,
    keywords: [item.code, item.nameAr, item.barcode].filter(Boolean).join(' '),
  };
}

export function ItemsGrid({
  items,
  onChange,
  availableItems,
  readOnly,
  unitMode = 'purchase',
  showBaseQty = true,
  warehouseId,
  asyncItemSearch = true,
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
  const [itemCache, setItemCache] = useState<Record<string, AvailableItem>>(() => {
    const map: Record<string, AvailableItem> = {};
    availableItems.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  });

  const localItemOptions = useMemo(
    () => availableItems.map((item) => toItemOption(item)),
    [availableItems]
  );

  const resolveItem = useCallback(
    (itemId: string) => itemCache[itemId] ?? availableItems.find((i) => i.id === itemId),
    [itemCache, availableItems]
  );

  useEffect(() => {
    setItemCache((prev) => {
      const next = { ...prev };
      availableItems.forEach((item) => {
        next[item.id] = item;
      });
      return next;
    });
  }, [availableItems]);

  useEffect(() => {
    if (items.length > 0) {
      setRows(items);
    }
  }, [items]);

  const searchItemOptions = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      const results = await searchItems(query, { warehouseId, limit: 20 });
      setItemCache((prev) => {
        const next = { ...prev };
        results.forEach((item) => {
          next[item.id] = {
            id: item.id,
            code: item.code,
            nameAr: item.nameAr,
            barcode: item.barcode,
            itemUnits: item.itemUnits,
          };
        });
        return next;
      });
      return results.map((item) =>
        toItemOption(
          {
            id: item.id,
            code: item.code,
            nameAr: item.nameAr,
            barcode: item.barcode,
            itemUnits: item.itemUnits,
          },
          item.stockBalance
        )
      );
    },
    [warehouseId]
  );

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
      const item = resolveItem(value as string);
      if (item) {
        row.itemNameSnapshot = item.nameAr;
        applyItemUnit(row, item);
      }
    }

    if (field === 'itemUnitId') {
      const item = resolveItem(row.itemId);
      if (item) applyItemUnit(row, item, value as string);
    }

    if (field === 'quantity') {
      row.quantity = coerceInteger(value, 0);
      const factor = row.factorToBase ?? 1;
      row.baseQty = calcBaseQty(row.quantity, factor);
    }

    if (field === 'unitPrice') {
      row.unitPrice = coerceInteger(value, 0);
    }

    if (['quantity', 'unitPrice', 'discount', 'tax'].includes(field)) {
      row.total = calculateLineTotal(row.quantity, row.unitPrice, row.discount, row.tax);
    }

    newRows[idx] = row;
    updateRows(newRows);
  };

  const getUnitsForRow = (itemId: string) => {
    const item = resolveItem(itemId);
    return item?.itemUnits ?? [];
  };

  const grandTotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);

  return (
    <div className="space-y-3 w-full">
      <div className="w-full rounded-lg border border-gray-200">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-[38%]">الصنف</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-[14%]">الوحدة</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600">الكمية</th>
              {showBaseQty && (
                <th className="px-3 py-2.5 text-right font-medium text-gray-600">أساسية</th>
              )}
              <th className="px-3 py-2.5 text-right font-medium text-gray-600">سعر الوحدة</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600">الخصم</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600">الإجمالي</th>
              <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-[12%]">البيان</th>
              {!readOnly && <th className="px-3 py-2.5 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => {
              const unitOptions = getUnitsForRow(row.itemId);
              const selectedUnit = unitOptions.find((u) => u.id === row.itemUnitId);
              const unitDisplayText = selectedUnit ? formatUnitLabel(selectedUnit) : '-';
              return (
                <tr key={idx} className="align-top">
                  <td className="px-3 py-3 align-top">
                    {readOnly ? (
                      <span
                        className="block whitespace-normal break-words leading-relaxed text-gray-900"
                        title={row.itemNameSnapshot}
                      >
                        {row.itemNameSnapshot}
                      </span>
                    ) : (
                      <AutocompleteSelect
                        value={row.itemId}
                        onChange={(next) => updateRow(idx, 'itemId', next)}
                        options={localItemOptions}
                        onSearch={asyncItemSearch ? searchItemOptions : undefined}
                        className="w-full"
                        inputClassName="w-full"
                        allowEmpty
                        emptyLabel="ابحث عن صنف..."
                        placeholder="كود، اسم، باركود..."
                        aria-label="اختيار الصنف"
                      />
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {readOnly ? (
                      <span
                        className="block whitespace-normal break-words leading-relaxed text-gray-900"
                        title={unitDisplayText !== '-' ? unitDisplayText : undefined}
                      >
                        {unitDisplayText}
                      </span>
                    ) : unitOptions.length > 0 ? (
                      <select
                        className="form-input text-sm w-full"
                        value={row.itemUnitId || ''}
                        onChange={(e) => updateRow(idx, 'itemUnitId', e.target.value)}
                        disabled={!row.itemId}
                        title={unitDisplayText !== '-' ? unitDisplayText : undefined}
                      >
                        {unitOptions.map((u) => {
                          const label = formatUnitLabel(u);
                          return (
                            <option key={u.id} value={u.id} title={label}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {readOnly ? row.quantity : (
                      <IntegerStepperInput
                        value={row.quantity}
                        onChange={(v) => updateRow(idx, 'quantity', v)}
                        min={0}
                        aria-label="الكمية"
                      />
                    )}
                  </td>
                  {showBaseQty && (
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                      {(row.baseQty ?? row.quantity).toFixed(2)}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    {readOnly ? row.unitPrice : (
                      <IntegerStepperInput
                        value={row.unitPrice}
                        onChange={(v) => updateRow(idx, 'unitPrice', v)}
                        min={0}
                        aria-label="سعر الوحدة"
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {readOnly ? row.discount.toFixed(2) : (
                      <input type="number" min="0" step="0.01" className="form-input text-sm"
                        value={row.discount} onChange={(e) => updateRow(idx, 'discount', parseFloat(e.target.value) || 0)} />
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap">{row.total.toFixed(2)}</td>
                  <td className="px-3 py-3">
                    {readOnly ? (
                      <span className="block whitespace-normal break-words leading-relaxed text-gray-900">
                        {row.notes || '-'}
                      </span>
                    ) : (
                      <input type="text" className="form-input text-sm w-full"
                        value={row.notes || ''} onChange={(e) => updateRow(idx, 'notes', e.target.value)} />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-3">
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

