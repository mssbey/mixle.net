import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="hero-editorial border-b border-line">
      <div className="container-page grid items-center gap-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="hero-copy relative z-10 py-8 sm:py-10 lg:py-12">
          <span className="eyebrow"><span className="h-px w-8 bg-current" /> Nefis Aroma dünyası</span>
          <h1 className="mt-4 max-w-xl text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.08]">
            Küçük bir damla, <span className="text-brand-500">bambaşka</span> bir dünya.
          </h1>
          <p className="mt-4 max-w-[420px] text-sm leading-6 text-ink-soft sm:text-base">Meyvenin canlılığından vanilyanın yumuşaklığına. Kendi tat dünyanı kurmak için aroma koleksiyonumuzu keşfet.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/urunler" className="btn-primary !px-5">Ürünleri Keşfet <ArrowRight size={17} /></Link>
            <Link href="/aroma-rehberi" className="btn-ghost !px-5">Aroma Rehberi <ArrowUpRight size={17} /></Link>
          </div>
        </div>
        <figure className="hero-photo relative -mx-4 sm:-mx-6 lg:mx-0 lg:rounded-lg lg:overflow-hidden">
          <Image src="/images/nefisaroma/hero/aroma-dunyasi.webp" alt="Krem taş üzerinde cam şişe, incir, böğürtlen ve turunçgil ile temsili aroma kompozisyonu" fill preload sizes="(max-width:1023px) 100vw, (max-width:1440px) 52vw, 680px" quality={75} className="object-cover object-[65%_center]" />
        </figure>
      </div>
    </section>
  );
}
