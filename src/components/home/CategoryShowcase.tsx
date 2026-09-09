import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { getCategories } from '@/data/categories';

const categoryImages: Record<string, { src: string; alt: string }> = {
  meyveli: { src: 'tfa-passion-fruit', alt: 'TFA Passion Fruit meyveli aroma görseli' },
  'tatli-kremsi': { src: 'inawera-miss-cream', alt: 'Inawera Miss Cream kremalı aroma görseli' },
  ferah: { src: 'tfa-cucumber', alt: 'TFA Cucumber salatalık aroma görseli' },
  icecek: { src: 'tfa-citrus-punch', alt: 'TFA Citrus Punch turunçgil içecek aroması görseli' },
};

export async function CategoryShowcase() {
  const categories = await getCategories();
  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <h2 className="store-section-title">Aroma Kategorileri</h2>
        <Link href="/urunler" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">Tüm aromalar <ArrowUpRight size={18} /></Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {categories.slice(0, 4).map((c) => (
          <Link key={c.slug} href={'/kategori/' + c.slug} className="group min-w-0">
            <div className="overflow-hidden rounded-lg border border-line bg-white transition-colors group-hover:border-brand-500">
              <div className="relative aspect-square">
                <Image src={categoryImages[c.slug] ? `/images/showcase/${categoryImages[c.slug].src}.webp` : c.cover} alt={categoryImages[c.slug]?.alt ?? c.name} fill sizes="(max-width:1023px) 50vw, 310px" className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line bg-mist px-3 py-4 sm:px-4">
                <h3 className="text-sm font-bold sm:text-base">{c.name}</h3>
                <ArrowUpRight size={17} className="shrink-0 text-brand-500" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
