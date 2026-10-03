'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types';
import { QuickView } from '@/components/product/QuickView';
import { HomeProductCard } from './HomeProductCard';
import { cn } from '@/lib/utils';

/** Sayfa başına otomatik kayma süresi (ms). */
const AUTOPLAY_MS = 4000;

/** Ekran genişliğine göre sayfa başına kart: 2 / 3 / 5. */
function usePerPage() {
  const [perPage, setPerPage] = useState(5);
  useEffect(() => {
    const lg = window.matchMedia('(min-width: 1024px)');
    const md = window.matchMedia('(min-width: 640px)');
    const update = () => setPerPage(lg.matches ? 5 : md.matches ? 3 : 2);
    update();
    lg.addEventListener('change', update);
    md.addEventListener('change', update);
    return () => {
      lg.removeEventListener('change', update);
      md.removeEventListener('change', update);
    };
  }, []);
  return perPage;
}

/**
 * Referanstaki ürün karuseli: sayfa sayfa kayar (500ms ease-in-out), kendiliğinden
 * ilerler, sağ üstte yuvarlak oklar, altta kırmızı aktif noktalı sayfalama.
 */
export function HomeRail({
  title,
  products,
  labelOf,
}: {
  title?: string;
  products: Product[];
  labelOf: Record<string, string>;
}) {
  const perPage = usePerPage();
  const pages = Math.max(1, Math.ceil(products.length / perPage));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);
  const dragX = useRef<number | null>(null);

  const go = useCallback((step: number) => setPage((p) => (p + step + pages) % pages), [pages]);
  const current = Math.min(page, pages - 1);

  useEffect(() => {
    if (paused || pages < 2) return;
    const id = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, pages, go, current]);

  if (products.length === 0) return null;

  return (
    <section
      className={cn('mx-auto max-w-[1300px] px-2 sm:px-4', title && 'py-3')}
      aria-label={title ?? 'Ürünler'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative">
        <div className="relative mb-3 flex min-h-[28px] items-center">
          {title && (
            <div className="flex w-full flex-col items-start">
              <h2 className="text-[15px] font-extrabold uppercase leading-tight tracking-wide text-gray-900 sm:text-lg">{title}</h2>
              <div className="mt-0.5 h-[2.5px] w-12 rounded-full bg-[#e31213]" />
            </div>
          )}
          {pages > 1 && (
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Önceki"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-[#e31213] hover:text-[#e31213]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Sonraki"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-[#e31213] hover:text-[#e31213]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div
          className="touch-pan-y select-none overflow-hidden"
          onPointerDown={(e) => {
            dragX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (dragX.current === null) return;
            const dx = e.clientX - dragX.current;
            dragX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            dragX.current = null;
          }}
        >
          <div
            className="-mx-1.5 flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {products.map((p) => (
              <div key={p.id} className="shrink-0 grow-0 px-1.5 py-1" style={{ flexBasis: `${100 / perPage}%` }}>
                <HomeProductCard product={p} label={labelOf[p.category] ?? ''} onQuickView={setQuick} />
              </div>
            ))}
          </div>
        </div>

        {pages > 1 && (
          <div className="mt-4 flex justify-center gap-1.5">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Sayfa ${i + 1}`}
                aria-pressed={i === current}
                className={cn(
                  'h-[5px] rounded-full transition-all duration-300',
                  i === current ? 'w-5 bg-[#e31213]' : 'w-[5px] bg-gray-300 hover:bg-gray-400',
                )}
              />
            ))}
          </div>
        )}
      </div>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </section>
  );
}
