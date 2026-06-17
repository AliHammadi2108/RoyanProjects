import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { getCurrentUser } from '@/lib/permissions';
import { getDefaultScreenHref } from '@/lib/screen-access';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const fallbackHref = user ? await getDefaultScreenHref(user.id) : '/login';

  return (
    <>
      <Header title="غير مصرح" subtitle="صلاحيات الوصول" />
      <PageContainer>
        <div className="card max-w-lg mx-auto text-center py-12">
          <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">لا تملك صلاحية الوصول</h2>
          <p className="text-gray-600 text-sm mb-6">
            ليس لديك صلاحية لعرض هذه الشاشة. تواصل مع مدير النظام إذا كنت تحتاج الوصول إليها.
          </p>
          {fallbackHref !== '/unauthorized' ? (
            <Link href={fallbackHref} className="btn-primary inline-flex">
              العودة للشاشة المتاحة
            </Link>
          ) : (
            <p className="text-sm text-gray-500">لا توجد شاشات متاحة لحسابك حالياً.</p>
          )}
        </div>
      </PageContainer>
    </>
  );
}
