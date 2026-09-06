import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProducts } from '@/data/products';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';

export async function BestSellersSection() {
  const products = await getProducts();
  const list = [...products.filter((p) => p.bestSeller), ...products]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 8);

  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Çok Satanlar"
          title="En çok tercih edilen aromalar"
          description="Farklı ailelerden, dengesi kanıtlanmış sekiz profil."
        />
        <Reveal>
          <Link href="/cok-satanlar" className="btn-ghost">
            Tümünü gör <ArrowRight size={15} />
          </Link>
        </Reveal>
      </div>

      <div className="mt-10">
        <ProductGrid products={list} priorityCount={4} />
      </div>
    </section>
  );
}
