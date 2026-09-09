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
  eyebrow,
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
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-bold text-ink sm:text-2xl">{title}</h2>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-brand-500"
        >
          Tümünü Gör <ArrowRight size={15} />
        </Link>
      </div>
      <div className="mt-6">
        <ProductRail products={list} />
      </div>
    </section>
  );
}
