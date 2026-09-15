import type { Metadata } from 'next';
import Link from 'next/link';
import { Hero } from '@/components/home/Hero';
import { SeriesStrip } from '@/components/home/SeriesStrip';
import { ProductRail } from '@/components/product/ProductRail';
import { getProducts } from '@/data/products';

export const metadata: Metadata = { alternates: { canonical: '/' } };

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

export default async function HomePage() {
  const products = await getProducts();
  const available = products.filter((p) => p.stockStatus !== 'out-of-stock');

  // Rayların tamamı gerçek katalog verisinden kurulur.
  const newest = [...available].reverse().slice(0, 15);
  const mixed = roundRobin(available, (p) => p.subcategory || p.series, 15);
  const onSale = available.filter((p) => p.variants.some((v) => v.onSale)).slice(0, 15);

  return (
    <div className="storefront-home reference-home">
      <Hero />

      <section className="container-page reference-products" aria-label="Yeni eklenenler">
        <h2 className="store-section-title">YENİ EKLENENLER</h2>
        <ProductRail products={newest} pagination />
      </section>

      <SeriesStrip products={products} />

      <section className="container-page reference-products" aria-label="Öne çıkan aromalar">
        <h2 className="store-section-title">ÖNE ÇIKAN AROMALAR</h2>
        <ProductRail products={mixed} pagination />
      </section>

      {onSale.length > 0 && (
        <section className="container-page reference-products" aria-label="İndirimli aromalar">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="store-section-title">FİYATI DÜŞENLER</h2>
            <Link href="/kampanyalar" className="text-sm font-semibold text-ink hover:text-brand-500">
              Tümünü gör
            </Link>
          </div>
          <ProductRail products={onSale} pagination />
        </section>
      )}
    </div>
  );
}
