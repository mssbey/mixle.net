import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/server/customers/auth';
import { enabledOAuthProviders } from '@/server/customers/oauth';
import { getSignupLegal } from '@/server/customers/signup-legal';
import { AuthShell } from '@/components/account/AuthShell';
import { RegisterForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Üye Ol',
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
    <AuthShell
      crumb="Üye Ol"
      title="Üye ol"
      subtitle="Daha önce üye olmadan sipariş verdiyseniz aynı e-postayla kayıt olun; siparişleriniz hesabınıza bağlanır."
    >
      <RegisterForm next={next} initialEmail={eposta} providers={enabledOAuthProviders()} legal={await getSignupLegal()} />
    </AuthShell>
  );
}
