import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { getProducts } from '@/data/products';
import { ProductRail } from '@/components/product/ProductRail';
import { discountPercent } from '@/lib/site';

type Source = 'bestSeller' | 'deals' | 'newArrival';

const pickers: Record<Source, (p: Product) => boolean> = {
  bestSeller: (p) => p.bestSeller,
  newArrival: (p) => p.newArrival,
  deals: (p) =>
    p.variants.some((v) => discountPercent(v.price, v.oldPrice) > 0) ||
    discountPercent(p.basePrice, p.oldPrice) > 0,
};

/**
 * Ana sayfa ürün rafı — başlık + "Tümünü Gör" + yatay ürün şeridi.
 * (Panelden yönetilen "Ana Sayfa Bölümleri" F6'da bu bileşeni besleyecek.)
 */
export async function HomeRail({
  title,
  eyebrow: _eyebrow,
  href,
  source,
  limit = 10,
}: {
  title: string;
  eyebrow: string;
  href: string;
  source: Source;
  limit?: number;
}) {
  const products = await getProducts();
  const list = products.filter(pickers[source]).slice(0, limit);
  if (list.length === 0) return null;

  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>

          <h2 className="store-section-title">{title}</h2>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-brand-500"
        >
          Tümünü Gör <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-4">
        <ProductRail products={list} />
      </div>
    </section>
  );
}
