// Hesap alanı — oturum zorunlu. Sol menü + içerik.

import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/server/customers/auth';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AccountNav } from '@/components/account/AccountNav';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentCustomer();
  if (!me) redirect('/giris?next=/hesabim');

  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Hesabım' }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <AccountNav name={`${me.firstName} ${me.lastName}`.trim() || me.email} email={me.email} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
