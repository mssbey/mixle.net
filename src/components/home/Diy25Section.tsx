import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getProducts } from '@/data/products';
import { ProductRail } from '@/components/product/ProductRail';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';

export async function Diy25Section() {
  const products = await getProducts();
  const list = products.filter((p) => p.series === '25 Yüksek Aroma');
  if (list.length === 0) return null;

  return (
    <section className="section container-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="25 Yüksek Aroma"
          title="Kendi seçkine yer aç."
          description="25 Yüksek Aroma serisini incele; tat notalarını ve demo hacim seçeneklerini karşılaştır. Görseller temsilidir."
        />
        <Reveal>
          <Link href="/kategori/diy-kitler" className="btn-ghost">
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
