import type { Metadata } from 'next';
import Link from 'next/link';
import { isResetTokenValid } from '@/server/customers/auth';
import { AuthShell } from '@/components/account/AuthShell';
import { ResetPasswordForm } from '@/components/account/AuthForms';

export const metadata: Metadata = {
  title: 'Yeni Parola Belirle',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const valid = t ? await isResetTokenValid(t) : false;

  return (
    <AuthShell crumb="Yeni Parola" title="Yeni parola belirle" benefits={false}>
      {valid ? (
        <ResetPasswordForm token={t!} />
      ) : (
        <div className="rounded-lg border border-line bg-white p-6 text-center sm:p-8">
          <p className="text-sm text-ink">Bu bağlantının süresi dolmuş veya daha önce kullanılmış.</p>
          <Link href="/sifremi-unuttum" className="btn-primary mt-5">Yeni bağlantı iste</Link>
        </div>
      )}
    </AuthShell>
  );
}
