'use client';

// WordPress'teki "Düzenle" bağlantısının karşılığı: panele giriş yapmış
// kullanıcıya ürün sayfasında doğrudan düzenleyiciye giden bir düğme.
//
// Ürün sayfaları statik olduğundan oturum sunucuda okunamaz. Panel her
// açıldığında tarayıcıya bir işaret bırakır (PANEL_HINT_KEY); işaret yoksa hiç
// istek atılmaz, varsa oturum `/api/admin/auth` ile doğrulanır.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { DEFAULT_STORE } from '@/lib/stores';

export const PANEL_HINT_KEY = 'panel-oturum';

export function AdminEditLink({ slug }: { slug: string }) {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let hint: string | null = null;
    try {
      hint = localStorage.getItem(PANEL_HINT_KEY);
    } catch {
      return;
    }
    if (!hint) return;
    let alive = true;
    fetch('/api/admin/auth', { cache: 'no-store' })
      .then((res) => {
        if (!alive) return;
        if (res.ok) setCanEdit(true);
        else if (res.status === 401) {
          try {
            localStorage.removeItem(PANEL_HINT_KEY);
          } catch {}
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!canEdit) return null;

  const href = `/admin/urunler/${encodeURIComponent(slug)}`;
  return (
    <a
      href={href}
      onClick={async (e) => {
        // Panelde başka mağaza seçiliyse ürün bulunamaz; önce bu vitrine geç.
        e.preventDefault();
        await fetch('/api/admin/magaza', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ store: DEFAULT_STORE }),
        }).catch(() => undefined);
        router.push(href);
      }}
      className="fixed bottom-20 left-4 z-[90] inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-ink/90 lg:bottom-6"
    >
      <Pencil size={15} /> Ürünü düzenle
    </a>
  );
}
