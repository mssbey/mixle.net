import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '@/types';

/**
 * Katalogdaki serileri (alt kategorileri) gösterir. Başlık ve görsel gerçek
 * üründen gelir; her kart o serinin filtrelenmiş kategori sayfasına gider.
 */
export function SeriesStrip({ products }: { products: Product[] }) {
  const series = new Map<string, { count: number; image: string; category: string }>();
  for (const p of products) {
    const key = p.subcategory || p.series;
    if (!key) continue;
    const found = series.get(key);
    if (found) found.count += 1;
    else series.set(key, { count: 1, image: p.images[0]?.src ?? '', category: p.category });
  }
  const items = [...series.entries()].sort((a, b) => b[1].count - a[1].count);
  if (items.length < 2) return null;

  return (
    <section className="container-page section !py-8" aria-label="Seriler">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="store-section-title">SERİLER</h2>
        <Link href="/urunler" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-brand-500">
          Tüm aromalar <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {items.map(([name, info]) => (
          <Link
            key={name}
            href={`/kategori/${info.category}?alt=${encodeURIComponent(name)}`}
            className="group min-w-0 overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-brand-500"
          >
            <div className="relative aspect-square bg-mist">
              {info.image && (
                <Image
                  src={info.image}
                  alt=""
                  fill
                  sizes="(max-width:768px) 50vw, 200px"
                  className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <div className="border-t border-line px-3 py-2.5">
              <h3 className="truncate text-[13px] font-semibold text-ink">{name}</h3>
              <p className="text-[11px] text-ink-soft">{info.count} ürün</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
