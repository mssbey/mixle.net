import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProducts } from '@/data/products';
import { ProductRail } from '@/components/product/ProductRail';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';

export async function NewArrivalsSection() {
  const products = await getProducts();
  const list = [...products.filter((p) => p.newArrival), ...products.filter((p) => p.newArrival === false)]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 10);

  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Yeni Gelenler" title="Kataloğa son eklenenler" />
        <Reveal>
          <Link href="/yeni-gelenler" className="btn-ghost">
            Tümünü gör <ArrowRight size={15} />
          </Link>
        </Reveal>
      </div>
      <Reveal className="mt-10">
        <ProductRail products={list} />
      </Reveal>
    </section>
  );
}
