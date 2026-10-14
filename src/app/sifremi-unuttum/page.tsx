import type { Metadata } from 'next';
import { AuthShell } from '@/components/account/AuthShell';
import { ForgotPasswordForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Parolamı Unuttum',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ eposta?: string }> }) {
  const { eposta } = await searchParams;
  return (
    <AuthShell
      crumb="Parolamı Unuttum"
      title="Parolamı unuttum"
      subtitle="Üyelik e-postanızı girin, parolanızı yenilemeniz için bir bağlantı gönderelim. Google veya Apple ile üye olduysanız bu yolla parola da belirleyebilirsiniz."
      benefits={false}
    >
      <ForgotPasswordForm initialEmail={eposta} />
    </AuthShell>
  );
}
