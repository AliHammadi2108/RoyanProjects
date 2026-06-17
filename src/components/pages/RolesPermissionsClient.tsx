'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { SearchBox } from '@/components/ui/SearchBox';
import { clientSearchMapped, SEARCH_MAPPINGS } from '@/lib/search';
import { saveRole } from '@/actions/access-control';

interface Permission {
  id: string;
  name: string;
  nameAr: string;
  module: string;
  screenCode?: string | null;
  action?: string | null;
}

interface RoleRow {
  id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  permissions: Array<{ permission: Permission }>;
}

export function RolesPermissionsClient({
  initialRoles,
  permissions,
}: {
  initialRoles: RoleRow[];
  permissions: Permission[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(initialRoles[0] || null);
  const [checked, setChecked] = useState<string[]>(
    initialRoles[0]?.permissions.map((p) => p.permission.id) || []
  );
  const [form, setForm] = useState({ name: '', nameAr: '', description: '' });
  const [error, setError] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');

  const filteredRoles = useMemo(
    () => clientSearchMapped(roles as unknown as Record<string, unknown>[], roleSearch, SEARCH_MAPPINGS.role),
    [roles, roleSearch]
  );

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const key = p.module;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const selectRole = (role: RoleRow) => {
    setSelectedRole(role);
    setChecked(role.permissions.map((p) => p.permission.id));
  };

  const togglePerm = (id: string) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveCurrentRole = async () => {
    if (!selectedRole) return;
    setError('');
    try {
      await saveRole(
        {
          name: selectedRole.name,
          nameAr: selectedRole.nameAr,
          description: '',
          isActive: selectedRole.isActive,
          permissionIds: checked,
        },
        selectedRole.id
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  const createRole = async () => {
    setError('');
    try {
      const created = await saveRole({
        ...form,
        isActive: true,
        permissionIds: [],
      });
      const row: RoleRow = { ...created, permissions: [] } as RoleRow;
      setRoles((prev) => [...prev, row]);
      selectRole(row);
      setForm({ name: '', nameAr: '', description: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الإنشاء');
    }
  };

  return (
    <>
      <Header title="الأدوار والصلاحيات" subtitle="تعيين صلاحيات الأدوار" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="card space-y-2">
            <h3 className="font-semibold mb-2">الأدوار</h3>
            <SearchBox value={roleSearch} onChange={setRoleSearch} placeholder="بحث بالدور..." className="mb-2" />
            {filteredRoles.map((r) => {
              const role = r as unknown as RoleRow;
              return (
              <button
                key={role.id}
                type="button"
                className={`w-full text-right px-3 py-2 rounded text-sm ${selectedRole?.id === role.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}
                onClick={() => selectRole(role)}
              >
                {role.nameAr}
              </button>
            );
            })}
            <div className="pt-4 border-t space-y-2">
              <input className="form-input text-sm" placeholder="اسم الدور (إنجليزي)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="form-input text-sm" placeholder="اسم الدور (عربي)" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              <button type="button" className="btn-secondary text-sm w-full" onClick={createRole}>دور جديد</button>
            </div>
          </div>
          <div className="lg:col-span-3 card">
            {selectedRole ? (
              <>
                <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                  <h3 className="font-semibold">صلاحيات: {selectedRole.nameAr}</h3>
                  <div className="flex items-center gap-2">
                    <SearchBox value={permSearch} onChange={setPermSearch} placeholder="بحث بالصلاحية..." />
                    <button type="button" className="btn-primary text-sm" onClick={saveCurrentRole}>حفظ الصلاحيات</button>
                  </div>
                </div>
                {Object.entries(grouped).map(([module, perms]) => {
                  const visiblePerms = permSearch
                    ? perms.filter((p) =>
                        `${p.nameAr} ${p.name}`.toLowerCase().includes(permSearch.trim().toLowerCase())
                      )
                    : perms;
                  if (visiblePerms.length === 0) return null;
                  return (
                  <div key={module} className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{module}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {visiblePerms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={checked.includes(p.id)} onChange={() => togglePerm(p.id)} />
                          <span>{p.nameAr}</span>
                          <span className="text-gray-400 text-xs">({p.name})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
                })}
              </>
            ) : (
              <p className="text-gray-500 text-sm">اختر دوراً</p>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
