'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  { image: '/images/reference/1.jpg', alt: 'Mixle aroma koleksiyonu', href: '/urunler' },
  { image: '/images/reference/2.jpg', alt: 'Dinner Lady aroma serisi', href: '/arama?q=Dinner%20Lady' },
];

/** Otomatik geçiş süresi (ms) — referans slider ile aynı tempo. */
const AUTOPLAY_MS = 3500;

export function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const change = useCallback((step: number) => setActive((v) => (v + step + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => change(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, change, active]);

  return (
    <section
      className="mx-auto max-w-[1300px] px-2 sm:px-4"
      aria-label="Öne çıkan koleksiyonlar"
      aria-roledescription="karusel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <h1 className="sr-only">Mixle Lezzet Sepeti</h1>
      <div className="group relative aspect-[3/1] overflow-hidden bg-[#f3f4f6] md:aspect-auto md:h-[400px]">
        {slides.map((slide, i) => (
          <div
            key={slide.image}
            aria-hidden={i !== active}
            className={cn('absolute inset-0 transition-opacity duration-700', i === active ? 'opacity-100' : 'pointer-events-none opacity-0')}
          >
            <Image src={slide.image} alt={slide.alt} fill preload={i === 0} sizes="(max-width: 1300px) 100vw, 1268px" className="object-cover" />
            <Link href={slide.href} aria-label={slide.alt} tabIndex={i === active ? 0 : -1} className="absolute inset-0 z-10" />
          </div>
        ))}
        <button
          type="button"
          onClick={() => change(-1)}
          aria-label="Önceki"
          className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => change(1)}
          aria-label="Sonraki"
          className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Slayt ${i + 1}`}
              aria-pressed={i === active}
              className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80')}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
