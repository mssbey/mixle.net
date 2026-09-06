// 403 ekranı — `src/proxy.ts` rolü yetersiz kullanıcıyı buraya yönlendirir.

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getCurrentUser } from '@/server/auth/current-user';
import { roleLabels } from '@/server/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function ForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="admin-card w-full max-w-md text-center" style={{ padding: 28 }}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fdecec] text-[#b42318]">
          <ShieldAlert size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-[var(--brand-purple-deep)]">
          Bu sayfaya erişim yetkiniz yok
        </h1>
        <p className="admin-hint mt-2">
          {user
            ? `${user.email} hesabının rolü “${roleLabels[user.role]}”. Bu bölüm daha yüksek yetki gerektiriyor.`
            : 'Oturumunuz sona ermiş olabilir.'}
        </p>
        <p className="admin-hint mt-2">
          Erişim gerekiyorsa mağaza sahibinden rolünüzün güncellenmesini isteyin.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/admin" className="admin-btn admin-btn-primary">
            Panel özetine dön
          </Link>
          <Link href="/" className="admin-btn admin-btn-ghost">
            Vitrine git
          </Link>
        </div>
      </div>
    </div>
  );
}
