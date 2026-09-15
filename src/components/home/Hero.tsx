"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  { image: '/images/reference/2.jpg', alt: 'Dinner Lady puff aroma serisi', href: '/kategori/puff-aromalar?alt=Dinner+Lady+Fruit+Full+Puff+Aroma' },
  { image: '/images/reference/1.jpg', alt: 'Mixle aroma koleksiyonu', href: '/kategori/puff-aromalar' },
];
export function Hero() {
  const [active, setActive] = useState(0);
  const change = (step: number) => setActive(value => (value + step + slides.length) % slides.length);
  return <section className="container-page reference-hero" aria-label="Öne çıkan koleksiyonlar" aria-roledescription="karusel">
    <h1 className="sr-only">Mixle Lezzet Sepeti</h1>
    <div className="reference-hero-frame">
      <Link href={slides[active].href}><Image src={slides[active].image} alt={slides[active].alt} fill preload={active === 0} sizes="(max-width: 640px) 100vw, 84vw" className="object-cover" /></Link>
      <button onClick={() => change(-1)} aria-label="Önceki banner" className="reference-hero-prev"><ChevronLeft /></button>
      <button onClick={() => change(1)} aria-label="Sonraki banner" className="reference-hero-next"><ChevronRight /></button>
      <div className="reference-hero-dots">{slides.map((slide, index) => <button key={slide.image} onClick={() => setActive(index)} aria-label={`${index + 1}. bannerı göster`} aria-pressed={active === index}><span className={active === index ? 'active' : ''} /></button>)}</div>
    </div>
  </section>;
}
