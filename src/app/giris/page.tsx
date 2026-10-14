import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/server/customers/auth';
import { enabledOAuthProviders, oauthErrorMessages, safeNextPath } from '@/server/customers/oauth';
import { AuthShell } from '@/components/account/AuthShell';
import { LoginForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Giriş Yap',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; hata?: string }> }) {
  const { next, hata } = await searchParams;
  const me = await getCurrentCustomer();
  if (me) redirect(safeNextPath(next));

  const initialError = hata && hata in oauthErrorMessages ? oauthErrorMessages[hata as keyof typeof oauthErrorMessages] : undefined;

  return (
    <AuthShell crumb="Giriş" title="Giriş yap" subtitle="Siparişlerinizi takip edin, adreslerinizi yönetin.">
      <LoginForm next={next} providers={enabledOAuthProviders()} initialError={initialError} />
    </AuthShell>
  );
}
