import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getCollections } from '@/data/categories';
import { getProducts } from '@/data/products';
import { SectionHeading, Reveal } from '@/components/ui/Reveal';

export async function SignatureCollections() {
  const [collections, products] = await Promise.all([getCollections(), getProducts()]);
  return (
    <section className="section container-page">
      <SectionHeading
        eyebrow="Koleksiyonlar"
        title="Nefis Aroma’ya özel üç seçki"
        description="Her koleksiyonun kendi atmosferi, hikâyesi ve seçilmiş ürünleri var."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {collections.map((c, i) => {
          const count = products.filter((p) => p.collection === c.slug).length;
          return (
            <Reveal key={c.slug} delay={i * 0.06}>
              <Link
                href={`/koleksiyon/${c.slug}`}
                className="group grid overflow-hidden rounded-[var(--radius-card)] border border-purple-100 bg-white shadow-soft transition-shadow hover:shadow-lift "
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={c.cover}
                    alt={c.name}
                    fill
                    sizes="(max-width:1024px) 100vw, 420px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-col justify-center gap-3 p-6 sm:p-7">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
                    {String(i + 1).padStart(2, '0')} · {count} ürün
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-purple-900 sm:text-3xl">
                    {c.name}
                  </h3>
                  <p className="text-sm font-medium text-purple-600">{c.subtitle}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">{c.description}</p>
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700">
                    Koleksiyonu keşfet
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
