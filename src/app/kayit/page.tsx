import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/server/customers/auth';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RegisterForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Hesap Oluştur',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; eposta?: string }>;
}) {
  const { next, eposta } = await searchParams;
  const me = await getCurrentCustomer();
  if (me) redirect('/hesabim');

  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Hesap Oluştur' }]} />
      <div className="mx-auto mt-6 max-w-md">
        <h1 className="text-display-sm">Hesap oluştur</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Daha önce misafir olarak sipariş verdiyseniz aynı e-postayla kayıt olun; siparişleriniz hesabınıza bağlanır.
        </p>
        <div className="mt-6">
          <RegisterForm next={next} initialEmail={eposta} />
        </div>
      </div>
    </div>
  );
}
