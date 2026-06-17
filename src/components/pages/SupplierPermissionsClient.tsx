'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { getUserSupplierPermissions, saveUserSupplierPermission } from '@/actions/access-control';

interface UserOption { id: string; nameAr: string; username: string }
interface SupplierOption { id: string; code: string; nameAr: string }

export function SupplierPermissionsClient({
  users,
  suppliers,
}: {
  users: UserOption[];
  suppliers: SupplierOption[];
}) {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const [rows, setRows] = useState<Array<{
    supplierId: string;
    canView: boolean;
    canUseInPurchase: boolean;
    canViewBalance: boolean;
    canEdit: boolean;
    canApproveTransactions: boolean;
  }>>([]);
  const [error, setError] = useState('');

  const load = async (id: string) => {
    setUserId(id);
    const data = await getUserSupplierPermissions(id);
    setRows(
      data.map((d) => ({
        supplierId: d.supplierId,
        canView: d.canView,
        canUseInPurchase: d.canUseInPurchase,
        canViewBalance: d.canViewBalance,
        canEdit: d.canEdit,
        canApproveTransactions: d.canApproveTransactions,
      }))
    );
  };

  const getRow = (supplierId: string) =>
    rows.find((r) => r.supplierId === supplierId) || {
      supplierId,
      canView: false,
      canUseInPurchase: false,
      canViewBalance: false,
      canEdit: false,
      canApproveTransactions: false,
    };

  const update = (supplierId: string, field: string, value: boolean) => {
    const current = getRow(supplierId);
    const next = { ...current, [field]: value };
    setRows((prev) => {
      const exists = prev.find((r) => r.supplierId === supplierId);
      if (!exists) return [...prev, next];
      return prev.map((r) => (r.supplierId === supplierId ? next : r));
    });
  };

  const saveAll = async () => {
    setError('');
    try {
      for (const row of rows) {
        const hasAny =
          row.canView ||
          row.canUseInPurchase ||
          row.canViewBalance ||
          row.canEdit ||
          row.canApproveTransactions;
        if (hasAny) {
          await saveUserSupplierPermission({ userId, ...row });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  return (
    <>
      <Header title="صلاحيات الموردين" subtitle="صلاحيات المستخدم على كل مورد" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <select className="form-input max-w-md mb-4" value={userId} onChange={(e) => load(e.target.value)}>
          {users.map((u) => <option key={u.id} value={u.id}>{u.nameAr}</option>)}
        </select>
        <button type="button" className="btn-secondary text-sm mr-2 mb-4" onClick={() => load(userId)}>تحميل</button>
        <button type="button" className="btn-primary text-sm mb-4" onClick={saveAll}>حفظ الكل</button>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right">المورد</th>
                <th className="px-3 py-2 text-center">عرض</th>
                <th className="px-3 py-2 text-center">استخدام في الشراء</th>
                <th className="px-3 py-2 text-center">عرض الرصيد</th>
                <th className="px-3 py-2 text-center">تعديل</th>
                <th className="px-3 py-2 text-center">اعتماد</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const row = getRow(s.id);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">{s.code} - {s.nameAr}</td>
                    {(['canView', 'canUseInPurchase', 'canViewBalance', 'canEdit', 'canApproveTransactions'] as const).map((field) => (
                      <td key={field} className="px-3 py-2 text-center">
                        <input type="checkbox" checked={row[field]} onChange={(e) => update(s.id, field, e.target.checked)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </>
  );
}
