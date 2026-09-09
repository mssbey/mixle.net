'use client';

import { useEffect, useState } from 'react';
import { X, Truck } from 'lucide-react';

/** İnce duyuru şeridi — header'ın en üstünde, oturum boyunca kapatılabilir. */
export function AnnouncementBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem('na-announce-hidden') === '1');
    } catch {}
  }, []);

  if (hidden) return null;

  return (
    <div className="relative bg-ink text-white">
      <div className="container-page flex h-9 items-center justify-center gap-2 !px-10 text-[11px] font-medium sm:text-xs">
        <Truck size={14} className="shrink-0 text-brand-300" />
        <span className="truncate">
          Güvenli ve sızdırmaz paketleme · 750 ₺ üzeri siparişlerde kargo bizden
        </span>
      </div>
      <button
        type="button"
        aria-label="Duyuruyu kapat"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem('na-announce-hidden', '1');
          } catch {}
        }}
        className="absolute right-1 top-0 grid h-9 w-9 place-items-center text-white/70 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
