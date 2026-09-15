import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { BrandBanners } from '@/components/home/BrandBanners';
import { ProductRail } from '@/components/product/ProductRail';
import { getProducts } from '@/data/products';
import type { Product } from '@/types';

/** Gruplardan sırayla birer ürün alarak `limit` kadar karışık liste kurar. */
function roundRobin<T>(items: T[], keyOf: (item: T) => string, limit: number): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]);
  const out: T[] = [];
  for (let i = 0; out.length < limit; i++) {
    let added = false;
    for (const group of groups.values()) {
      if (group[i]) { out.push(group[i]); added = true; }
      if (out.length >= limit) break;
    }
    if (!added) break;
  }
  return out;
}

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const products = await getProducts();
  const inStock = (p: Product) => p.stockStatus !== 'out-of-stock';
  const puff = products.filter(p => p.category === 'puff-aromalar' && inStock(p));

  // Yeni eklenenler: gerçek Puff kataloğu önce, ardından diğer "yeni" işaretliler.
  const newest = [...puff, ...products.filter(p => p.newArrival && p.category !== 'puff-aromalar'), ...products.filter(p => !p.newArrival)].slice(0, 15);
  // Puff serilerinden dönüşümlü seçim (Drifter / IVG / Vampire Vape / Mixle Puff …) — tek seri rayı doldurmasın.
  const popular = roundRobin(puff, p => p.series, 15);
  const aromas = products.filter(p => p.images[0]?.src.includes('tfa')).slice(0, 15);
  return <div className="storefront-home reference-home">
    <Hero />
    <section className="container-page reference-products" aria-label="Yeni eklenenler">
      <h2 className="store-section-title">YENİ EKLENENLER</h2>
      <ProductRail products={newest} pagination />
    </section>
    <BrandBanners group="first" />
    <section className="container-page reference-products reference-products-untitled" aria-label="Popüler aromalar"><ProductRail products={popular} pagination /></section>
    <BrandBanners group="second" />
    <section className="container-page reference-products reference-products-untitled" aria-label="Aroma çeşitleri"><ProductRail products={aromas.length ? aromas : products.slice(15, 30)} pagination /></section>
    <BrandBanners group="last" />
  </div>;
}
