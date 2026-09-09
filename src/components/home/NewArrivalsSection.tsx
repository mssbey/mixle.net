import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProducts } from '@/data/products';
import { ProductRail } from '@/components/product/ProductRail';

export async function NewArrivalsSection() {
  const products = await getProducts();
  const list = [...products.filter((p) => p.newArrival), ...products.filter((p) => p.newArrival === false)]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 10);

  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="store-section-title">Yeni Eklenenler</h2>
        <div>
          <Link href="/yeni-gelenler" className="inline-flex items-center gap-2 text-xs font-semibold hover:text-brand-500">
            Tümünü gör <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <ProductRail products={list} />
      </div>
    </section>
  );
}
