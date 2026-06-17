'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SearchBox } from '@/components/ui/SearchBox';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';
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
  const [userSearch, setUserSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  const filteredUsers = useMemo(
    () => clientSearchMapped(users as unknown as Record<string, unknown>[], userSearch, SEARCH_MAPPINGS.user),
    [users, userSearch]
  );

  const filteredSuppliers = useMemo(
    () => clientSearchMapped(suppliers as unknown as Record<string, unknown>[], supplierSearch, SEARCH_MAPPINGS.supplier),
    [suppliers, supplierSearch]
  );

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
        <div className="card mb-4 space-y-3">
          <SearchBox value={userSearch} onChange={setUserSearch} placeholder="بحث بالمستخدم..." />
          <select className="form-input max-w-md" value={userId} onChange={(e) => load(e.target.value)}>
            {filteredUsers.map((u) => {
              const user = u as unknown as UserOption;
              return <option key={user.id} value={user.id}>{user.nameAr}</option>;
            })}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <button type="button" className="btn-secondary text-sm" onClick={() => load(userId)}>تحميل</button>
          <button type="button" className="btn-primary text-sm" onClick={saveAll}>حفظ الكل</button>
          <SearchBox value={supplierSearch} onChange={setSupplierSearch} placeholder="بحث بالمورد..." className="max-w-xs" />
        </div>

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
              {filteredSuppliers.map((s) => {
                const supplier = s as unknown as SupplierOption;
                const row = getRow(supplier.id);
                return (
                  <tr key={supplier.id} className="border-t">
                    <td className="px-3 py-2">{supplier.code} - {supplier.nameAr}</td>
                    {(['canView', 'canUseInPurchase', 'canViewBalance', 'canEdit', 'canApproveTransactions'] as const).map((field) => (
                      <td key={field} className="px-3 py-2 text-center">
                        <input type="checkbox" checked={row[field]} onChange={(e) => update(supplier.id, field, e.target.checked)} />
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
