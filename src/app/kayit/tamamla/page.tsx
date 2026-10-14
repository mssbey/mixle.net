// Google/Apple ile ilk kez gelen müşteri: sözleşmeleri onaylayıp üyeliği tamamlar.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentCustomer } from '@/server/customers/auth';
import { readPendingSignup } from '@/server/customers/oauth';
import { getSignupLegal } from '@/server/customers/signup-legal';
import { AuthShell } from '@/components/account/AuthShell';
import { SocialSignupForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Üyeliği Tamamla',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CompleteSignupPage() {
  if (await getCurrentCustomer()) redirect('/hesabim');
  const pending = await readPendingSignup();
  if (!pending) redirect('/giris?hata=oturum');

  return (
    <AuthShell crumb="Üyeliği Tamamla" title="Son bir adım" subtitle="Üyeliğinizi tamamlamak için bilgilerinizi kontrol edin ve sözleşmeleri onaylayın.">
      <SocialSignupForm
        provider={pending.p}
        email={pending.email}
        initialFirstName={pending.firstName}
        initialLastName={pending.lastName}
        legal={await getSignupLegal()}
      />
    </AuthShell>
  );
}
