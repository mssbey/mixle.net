"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  { title: 'Tatlı bir dokunuş.', text: 'Vanilyanın yumuşaklığı, kremanın zenginliği. Tatlı aroma dünyasını keşfet.', image: '/images/showcase/inawera-vanilla.webp', alt: 'Inawera Vanilla aroma şişesi ve vanilya çubukları', href: '/kategori/tatli-kremsi', label: 'Tatlı aromaları keşfet', eyebrow: 'INAWERA · VANILLA' },
  { title: 'Tropikal tatlara yolculuk.', text: 'Meyvelerin canlı karakterinden ilham al. Kendi favori aroma profilini bul.', image: '/images/showcase/tfa-passion-fruit.webp', alt: 'TFA Passion Fruit çarkıfelek meyvesi aroma görseli', href: '/kategori/meyveli', label: 'Meyveli aromaları keşfet', eyebrow: 'TFA · PASSION FRUIT' },
];

export function Hero() {
  const [active, setActive] = useState(0);
  const slide = slides[active];
  const change = (step: number) => setActive((current) => (current + step + slides.length) % slides.length);

  return (
    <section className="container-page pt-4" aria-label="Öne çıkan koleksiyonlar" aria-roledescription="karusel">
      <div className="store-hero store-hero-products relative isolate overflow-hidden rounded-lg border border-line bg-[#faf7f2]">
        <div className="store-hero-art absolute inset-y-0 right-0 w-1/2 bg-white">
          <Image key={slide.image} src={slide.image} alt={slide.alt} fill preload={active === 0} sizes="(max-width:639px) 70vw, (max-width:1300px) 50vw, 630px" className="object-contain p-6 sm:p-8" />
        </div>
        <div className="store-hero-copy relative flex h-full w-1/2 flex-col justify-center px-12 pb-8 pt-6 lg:px-16" aria-live="polite">
          <p className="text-[10px] font-bold tracking-[0.16em] text-brand-600 sm:text-xs">{slide.eyebrow}</p>
          <h1 className="mt-3 max-w-[460px] text-3xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[56px]">{slide.title}</h1>
          <p className="mt-4 max-w-[310px] text-xs leading-5 text-ink-soft sm:text-sm sm:leading-6">{slide.text}</p>
          <Link href={slide.href} className="btn-primary mt-5 w-fit !px-4 !text-xs sm:!text-sm">{slide.label} <ArrowRight size={16} /></Link>
        </div>
        <button type="button" onClick={() => change(-1)} aria-label="Önceki banner" className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white hover:bg-black/55"><ChevronLeft size={20} /></button>
        <button type="button" onClick={() => change(1)} aria-label="Sonraki banner" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white hover:bg-black/55"><ChevronRight size={20} /></button>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1">
          {slides.map((item, index) => <button key={item.href} type="button" onClick={() => setActive(index)} aria-label={`${index + 1}. bannerı göster`} aria-pressed={active === index} className="grid h-7 min-w-7 place-items-center"><span className={`h-1.5 rounded-full ${active === index ? 'w-6 bg-brand-500' : 'w-1.5 bg-ink/30'}`} /></button>)}
        </div>
      </div>
    </section>
  );
}
