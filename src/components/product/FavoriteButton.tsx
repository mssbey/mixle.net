'use client';

import { Heart } from 'lucide-react';
import { m } from 'framer-motion';
import { useFavorites } from '@/store/favorites';
import { useMounted } from '@/lib/hooks';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

export function FavoriteButton({
  productId,
  productName,
  className,
  size = 18,
}: {
  productId: string;
  productName?: string;
  className?: string;
  size?: number;
}) {
  const mounted = useMounted();
  const { ids, toggle } = useFavorites();
  const active = mounted && ids.includes(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
        toast.info(
          active ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi',
          productName,
        );
      }}
      aria-pressed={active}
      aria-label={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      className={cn(
        'grid place-items-center rounded-full border border-line bg-white/95 text-ink shadow-card backdrop-blur transition-colors hover:text-brand-500',
        active && 'text-brand-500',
        className,
      )}
    >
      <m.span key={String(active)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
        <Heart size={size} fill={active ? 'currentColor' : 'none'} />
      </m.span>
    </button>
  );
}
