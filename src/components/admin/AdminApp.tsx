'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminDataProvider } from './AdminDataProvider';
import { AdminShell } from './AdminShell';

/** /admin/giris kimlik doğrulamadan önce açıldığı için kabuk/veri sağlayıcı olmadan render edilir. */
export function AdminApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Odaktaki sayı alanının üstünde fare tekerleği çevrilince tarayıcı değeri
  // artırıp azaltır (fiyat 234 → 234,01 gibi). Alanı odaktan çıkararak bunu
  // engelliyoruz; tekerlek normal şekilde sayfayı kaydırmaya devam eder.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.type === 'number' && el === document.activeElement) {
        el.blur();
      }
    };
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

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
