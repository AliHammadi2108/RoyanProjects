import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/permissions';
import { getDefaultScreenHref } from '@/lib/screen-access';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await getDefaultScreenHref(user.id));
  } else {
    redirect('/login');
  }
}
