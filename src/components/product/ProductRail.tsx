'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { QuickView } from './QuickView';
import { cn } from '@/lib/utils';

export function ProductRail({ products, className, pagination = false }: { products: Product[]; className?: string; pagination?: boolean }) {
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', dragFree: !pagination, slidesToScroll: pagination ? 'auto' : 1, containScroll: 'trimSnaps' });
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [prev, setPrev] = useState(false);
  const [next, setNext] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
    setSnaps(embla.scrollSnapList());
    setPrev(embla.canScrollPrev());
    setNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect).on('reInit', onSelect);
    return () => { embla.off('select', onSelect).off('reInit', onSelect); };
  }, [embla, onSelect]);

  return (
    <div className={cn('product-rail relative', className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="product-rail-track flex gap-4 sm:gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="product-rail-slide min-w-0 shrink-0 grow-0 basis-[64%] sm:basis-[40%] lg:basis-[28%] xl:basis-[23%]"
            >
              <ProductCard product={p} onQuickView={setQuick} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 hidden justify-end gap-2 sm:flex">
        <button
          type="button"
          onClick={() => embla?.scrollPrev()}
          disabled={!prev}
          aria-label="Önceki"
          className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-mist disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => embla?.scrollNext()}
          disabled={!next}
          aria-label="Sonraki"
          className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-mist disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {pagination && <div className="reference-rail-dots" aria-label="Ürün slaytları">{snaps.map((_, index) => <button key={index} type="button" onClick={() => embla?.scrollTo(index)} aria-label={`${index + 1}. ürün grubunu göster`} aria-pressed={selected === index}><span className={selected === index ? 'active' : ''} /></button>)}</div>}
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
