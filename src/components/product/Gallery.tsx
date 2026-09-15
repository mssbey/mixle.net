'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { Expand, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import type { ProductImage } from '@/types';
import { useMounted, useScrollLock, useDialog } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export function Gallery({
  images,
  productName,
  activeHint,
  representative = true,
}: {
  images: ProductImage[];
  productName: string;
  activeHint?: string;
  /** false: gerçek ürün fotoğrafı — "temsili görsel" notları gizlenir. */
  representative?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState({ x: 50, y: 50, on: false });
  const [fullscreen, setFullscreen] = useState(false);
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start' });

  useEffect(() => {
    if (!embla) return;
    embla.on('select', () => setActive(embla.selectedScrollSnap()));
  }, [embla]);

  useEffect(() => {
    embla?.scrollTo(active);
  }, [embla, active]);

  useEffect(() => setActive(0), [activeHint]);

  return (
    <div>
      {representative && (
        <p className="mb-3 text-xs leading-5 text-ink-soft">Temsili görsel: tat profilini anlatır; ürünün ambalajını veya markasını göstermez.</p>
      )}
      <div className="hidden gap-3 sm:flex">
        <div className="flex w-16 flex-col gap-2.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Görsel ${i + 1}`}
              aria-current={active === i}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border-2 transition-colors',
                active === i ? 'border-brand-500' : 'border-line hover:border-ink/30',
              )}
            >
              <Image src={img.src} alt="" fill sizes="64px" className="object-contain bg-white" />
            </button>
          ))}
        </div>

        <div
          className="group relative flex-1 overflow-hidden rounded-lg border border-line bg-mist"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true });
          }}
          onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
        >
          <div className="relative aspect-square w-full">
            <Image
              src={images[active].src}
              alt={images[active].alt || productName}
              fill
              sizes="(max-width:1024px) 100vw, 50vw"
              loading="eager"
              className="object-contain bg-white transition-transform duration-200"
              style={
                zoom.on
                  ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Tam ekran galeri"
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-line bg-white/95 text-ink shadow-card"
          >
            <Expand size={17} />
          </button>
        </div>
      </div>

      {/* Mobil: swipe galeri */}
      <div className="sm:hidden">
        <div className="overflow-hidden rounded-lg border border-line" ref={emblaRef}>
          <div className="flex">
            {images.map((img, i) => (
              <div key={img.src} className="relative aspect-square min-w-0 shrink-0 grow-0 basis-full bg-mist">
                <Image src={img.src} alt={img.alt || productName} fill loading={i === 0 ? "eager" : "lazy"} sizes="100vw" className="object-contain bg-white" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button type="button" onClick={() => setActive(i)} aria-label={"Görsel " + (i + 1)} aria-current={active === i} key={i} className={cn('h-2 rounded-full transition-all', active === i ? 'w-5 bg-brand-500' : 'w-2 bg-line')} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFullscreen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-soft sm:hidden"
      >
        <Expand size={13} /> Tam ekran görüntüle
      </button>
      {representative && (
        <p className="mt-3 text-xs leading-5 text-ink-soft">Görseller aroma dünyasını anlatan temsili kompozisyonlardır; gerçek ürün ambalajını veya içeriğini göstermez.</p>
      )}

      <FullscreenGallery
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        images={images}
        index={active}
        setIndex={setActive}
        productName={productName}
      />
    </div>
  );
}

function FullscreenGallery({
  open,
  onClose,
  images,
  index,
  setIndex,
  productName,
}: {
  open: boolean;
  onClose: () => void;
  images: ProductImage[];
  index: number;
  setIndex: (i: number) => void;
  productName: string;
}) {
  const mounted = useMounted();
  useScrollLock(open);
  const ref = useDialog(open, onClose);
  const next = useCallback(() => setIndex((index + 1) % images.length), [index, images.length, setIndex]);
  const prev = useCallback(() => setIndex((index - 1 + images.length) % images.length), [index, images.length, setIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-ink/95 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} — tam ekran galeri`}
            tabIndex={-1}
            className="relative flex h-full w-full max-w-4xl items-center justify-center outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full text-cream/80 hover:text-cream"
            >
              <X size={22} />
            </button>
            <button
              type="button"
              onClick={prev}
              aria-label="Önceki görsel"
              className="absolute left-0 grid h-11 w-11 place-items-center rounded-full text-cream/70 hover:text-cream"
            >
              <ChevronLeft size={26} />
            </button>
            <div className="relative aspect-square w-full max-w-xl">
              <Image src={images[index].src} alt={images[index].alt || productName} fill sizes="90vw" className="object-contain" />
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Sonraki görsel"
              className="absolute right-0 grid h-11 w-11 place-items-center rounded-full text-cream/70 hover:text-cream"
            >
              <ChevronRight size={26} />
            </button>
            <p className="absolute bottom-2 text-xs text-cream/60">
              {index + 1} / {images.length}
            </p>
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
