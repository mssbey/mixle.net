import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/server/customers/auth';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LoginForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Giriş Yap',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const me = await getCurrentCustomer();
  if (me) redirect(next && next.startsWith('/') ? next : '/hesabim');

  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Giriş' }]} />
      <div className="mx-auto mt-6 max-w-md">
        <h1 className="text-display-sm">Giriş yap</h1>
        <p className="mt-2 text-sm text-ink-soft">Siparişlerinizi takip edin, adreslerinizi yönetin.</p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
