'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminDataProvider } from './AdminDataProvider';
import { AdminShell } from './AdminShell';

/** /admin/giris kimlik doğrulamadan önce açıldığı için kabuk/veri sağlayıcı olmadan render edilir. */
export function AdminApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/giris' || pathname === '/admin/yetkisiz') {
    return <div className="admin-scope">{children}</div>;
  }

  // Yazdırma sayfaları (fatura/irsaliye) kabuk ve panel stilleri olmadan,
  // kendi print CSS'iyle render edilir.
  if (pathname.includes('/yazdir')) {
    return <>{children}</>;
  }

  return (
    <div className="admin-scope">
      <AdminDataProvider>
        <AdminShell>{children}</AdminShell>
      </AdminDataProvider>
    </div>
  );
}
