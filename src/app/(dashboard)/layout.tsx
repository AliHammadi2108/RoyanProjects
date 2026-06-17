import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/permissions';
import {
  canAccessPath,
  getAccessibleHrefs,
  getScreenPermissionForPath,
} from '@/lib/screen-access';
import { Providers } from '@/components/Providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { fetchUnreadCount } from '@/actions/common';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pathname = headers().get('x-pathname') || '';
  const allowedHrefs = await getAccessibleHrefs(user.id);

  if (pathname && pathname !== '/unauthorized') {
    const requiredPermission = getScreenPermissionForPath(pathname);
    if (requiredPermission && !(await canAccessPath(user.id, pathname))) {
      redirect('/unauthorized');
    }
  }

  let unreadCount = 0;
  try {
    unreadCount = await fetchUnreadCount();
  } catch {
    // ignore
  }

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 print:min-h-0 print:bg-white">
        <Sidebar unreadCount={unreadCount} allowedHrefs={allowedHrefs} />
        <main className="mr-64 min-h-screen print:mr-0 print:min-h-0 print:w-full print:max-w-none">
          {children}
        </main>
      </div>
    </Providers>
  );
}
