'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { SearchBox } from '@/components/ui/SearchBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { clientSearch, SEARCH_MAPPINGS } from '@/lib/search';
import { fetchUsers, getUsersFormOptions, removeUserAction, saveUserAction } from '@/actions/users';

type UserRow = Record<string, unknown> & {
  id: string;
  userNo: string;
  nameAr: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  notes?: string | null;
  roles?: Array<{ role: { id: string; nameAr: string } }>;
  userPermissions?: Array<{ permissionId: string }>;
  supplierPermissions?: Array<{ supplierId: string }>;
};

export function UsersSettingsClient({ initialData }: { initialData: UserRow[] }) {
  const [rows, setRows] = useState(initialData);
  const [search, setSearch] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [options, setOptions] = useState<{
    roles: Array<{ id: string; nameAr: string }>;
    permissions: Array<{ id: string; name: string; nameAr: string; module: string }>;
    suppliers: Array<{ id: string; nameAr: string; code: string }>;
    branches: Array<{ id: string; nameAr: string }>;
    departments: Array<{ id: string; nameAr: string }>;
  } | null>(null);

  const [form, setForm] = useState({
    userNo: '',
    nameAr: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    notes: '',
    branchId: '',
    departmentId: '',
    roleIds: [] as string[],
    permissionIds: [] as string[],
    supplierIds: [] as string[],
  });

  useEffect(() => {
    getUsersFormOptions().then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!serverSearch) return;
    setSearchLoading(true);
    fetchUsers(serverSearch)
      .then((data) => setRows(data as UserRow[]))
      .catch(() => {})
      .finally(() => setSearchLoading(false));
  }, [serverSearch]);

  const filtered = useMemo(() => {
    if (serverSearch) return rows;
    return clientSearch(rows, search, [(r) => SEARCH_MAPPINGS.user(r).join(' ')]);
  }, [rows, search, serverSearch]);

  const resetForm = () => {
    setEditId(null);
    setForm({
      userNo: '',
      nameAr: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      isActive: true,
      notes: '',
      branchId: '',
      departmentId: '',
      roleIds: [],
      permissionIds: [],
      supplierIds: [],
    });
  };

  const startEdit = (row: UserRow) => {
    setEditId(row.id);
    setForm({
      userNo: row.userNo,
      nameAr: row.nameAr,
      phone: row.phone || '',
      email: row.email,
      password: '',
      confirmPassword: '',
      isActive: row.isActive,
      notes: row.notes || '',
      branchId: (row.branchId as string) || '',
      departmentId: (row.departmentId as string) || '',
      roleIds: (row.roles || []).map((r) => r.role.id),
      permissionIds: [],
      supplierIds: (row.supplierPermissions || []).map((s) => s.supplierId),
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const saved = await saveUserAction(form, editId || undefined);
      if (editId) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editId
              ? {
                  ...r,
                  ...saved,
                  userNo: saved.userNo ?? r.userNo,
                  roles: form.roleIds.map((id) => ({
                    role: options?.roles.find((ro) => ro.id === id) || { id, nameAr: '' },
                  })),
                }
              : r
          )
        );
      } else {
        const refreshed = await fetchUsers();
        setRows(refreshed as UserRow[]);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`هل تريد تعطيل/حذف المستخدم ${name}؟`)) return;
    setLoading(true);
    setError('');
    try {
      await removeUserAction(id);
      const refreshed = await fetchUsers(serverSearch || undefined);
      setRows(refreshed as UserRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التعطيل');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'userNo', label: 'رقم المستخدم' },
    { key: 'nameAr', label: 'الاسم' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد' },
    {
      key: 'roles',
      label: 'الأدوار',
      render: (row: UserRow) =>
        (row.roles || []).map((r) => r.role.nameAr).join('، ') || '-',
    },
    {
      key: 'isActive',
      label: 'الحالة',
      render: (row: UserRow) => (
        <StatusBadge status={row.isActive ? 'Approved' : 'Cancelled'} />
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (row: UserRow) => (
        <div className="flex gap-1">
          <button type="button" className="btn-secondary text-xs py-1" onClick={() => startEdit(row)}>
            تعديل
          </button>
          <button
            type="button"
            className="text-xs py-1 px-2 rounded bg-red-50 text-red-700 hover:bg-red-100"
            onClick={() => handleDeactivate(row.id, row.nameAr)}
          >
            تعطيل
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="إدارة المستخدمين" subtitle="إنشاء وتعديل حسابات النظام" />
      <PageContainer>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="card mb-4">
          <h3 className="font-semibold mb-3">{editId ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="form-label">رقم المستخدم *</label>
              <input
                className="form-input"
                value={form.userNo}
                onChange={(e) => setForm({ ...form, userNo: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1"
                dir="ltr"
                disabled={!!editId}
              />
            </div>
            <div>
              <label className="form-label">الاسم الكامل *</label>
              <input
                className="form-input"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">الهاتف</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <label className="form-label">البريد الإلكتروني *</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <label className="form-label">{editId ? 'كلمة مرور جديدة' : 'كلمة المرور *'}</label>
              <input
                type="password"
                className="form-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <label className="form-label">تأكيد كلمة المرور</label>
              <input
                type="password"
                className="form-input"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm">نشط</label>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">ملاحظات</label>
              <textarea
                className="form-input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            {options && (
              <>
                <div>
                  <label className="form-label">الأدوار</label>
                  <select
                    multiple
                    className="form-input h-24"
                    value={form.roleIds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        roleIds: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                  >
                    {options.roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">الموردون المسموحون</label>
                  <select
                    multiple
                    className="form-input h-24"
                    value={form.supplierIds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        supplierIds: Array.from(e.target.selectedOptions, (o) => o.value),
                      })
                    }
                  >
                    {options.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} - {s.nameAr}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" className="btn-primary" disabled={loading} onClick={handleSave}>
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            {editId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                إلغاء
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
            <h3 className="font-semibold">قائمة المستخدمين ({filtered.length})</h3>
            <SearchBox
              value={search}
              onChange={setSearch}
              onDebouncedChange={(q) => {
                if (rows.length > 20) setServerSearch(q);
                else setServerSearch('');
              }}
              debounceMs={400}
              loading={searchLoading}
              placeholder="بحث برقم/اسم/هاتف/دور..."
            />
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage={search ? 'لا توجد نتائج' : 'لا يوجد مستخدمون'}
          />
        </div>
      </PageContainer>
    </>
  );
}
