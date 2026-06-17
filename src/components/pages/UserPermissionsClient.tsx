'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  getUserRolesAndPermissions,
  setUserRoles,
  saveUserPermission,
  removeUserPermission,
} from '@/actions/access-control';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface UserOption {
  id: string;
  username: string;
  nameAr: string;
}

interface RoleOption {
  id: string;
  nameAr: string;
}

interface Permission {
  id: string;
  name: string;
  nameAr: string;
}

export function UserPermissionsClient({
  users,
  roles,
  permissions,
}: {
  users: UserOption[];
  roles: RoleOption[];
  permissions: Permission[];
}) {
  const [userId, setUserId] = useState(users[0]?.id || '');
  const [data, setData] = useState<{
    roles: Array<{ roleId: string }>;
    direct: Array<{ permissionId: string; effect: string; permission: Permission }>;
    effective: string[];
  } | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const loadUser = async (id: string) => {
    setUserId(id);
    const result = await getUserRolesAndPermissions(id);
    setData(result);
    setRoleIds(result.roles.map((r: { roleId: string }) => r.roleId));
  };

  const saveRoles = async () => {
    try {
      await setUserRoles(userId, roleIds);
      await loadUser(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  const setDirect = async (permissionId: string, effect: 'allow' | 'deny' | 'remove') => {
    try {
      if (effect === 'remove') {
        await removeUserPermission(userId, permissionId);
      } else {
        await saveUserPermission({ userId, permissionId, effect });
      }
      await loadUser(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحديث');
    }
  };

  return (
    <>
      <Header title="صلاحيات المستخدمين" subtitle="الأدوار والسماح/المنع المباشر" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <div className="card mb-4">
          <label className="form-label">المستخدم</label>
          <select className="form-input max-w-md" value={userId} onChange={(e) => loadUser(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.nameAr} ({u.username})</option>
            ))}
          </select>
          <button type="button" className="btn-secondary text-sm mt-2" onClick={() => userId && loadUser(userId)}>
            تحميل الصلاحيات
          </button>
        </div>

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-3">الأدوار</h3>
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm mb-2">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(r.id)}
                    onChange={(e) =>
                      setRoleIds((prev) =>
                        e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)
                      )
                    }
                  />
                  {r.nameAr}
                </label>
              ))}
              <button type="button" className="btn-primary text-sm mt-3" onClick={saveRoles}>حفظ الأدوار</button>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3">الصلاحيات النهائية ({data.effective.length})</h3>
              <div className="max-h-64 overflow-y-auto text-xs space-y-1 mb-4">
                {data.effective.map((p) => (
                  <div key={p} className="text-gray-700">{p}</div>
                ))}
              </div>
              <h3 className="font-semibold mb-3">تجاوز مباشر</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {permissions.slice(0, 40).map((p) => {
                  const direct = data.direct.find((d) => d.permissionId === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2">
                      <span>{p.nameAr}</span>
                      <div className="flex gap-1">
                        <button type="button" className={`text-xs px-2 py-1 rounded ${direct?.effect === 'allow' ? 'bg-green-100' : 'bg-gray-100'}`}
                          onClick={() => setDirect(p.id, 'allow')}>سماح</button>
                        <button type="button" className={`text-xs px-2 py-1 rounded ${direct?.effect === 'deny' ? 'bg-red-100' : 'bg-gray-100'}`}
                          onClick={() => setDirect(p.id, 'deny')}>منع</button>
                        {direct && (
                          <button type="button" className="text-xs text-gray-500" onClick={() => setDirect(p.id, 'remove')}>إزالة</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
