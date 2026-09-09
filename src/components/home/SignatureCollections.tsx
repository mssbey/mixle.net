import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getCollections } from '@/data/categories';
import { getProducts } from '@/data/products';
import { Reveal } from '@/components/ui/Reveal';

export async function SignatureCollections() {
  const [collections, products] = await Promise.all([getCollections(), getProducts()]);
  return (
    <section className="section container-page">
      <h2 className="store-section-title">Özel Koleksiyonlar</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {collections.map((c, i) => {
          const count = products.filter((p) => p.collection === c.slug).length;
          return (
            <Reveal key={c.slug} delay={i * 0.06}>
              <Link
                href={`/koleksiyon/${c.slug}`}
                className="group grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-soft transition-shadow hover:shadow-lift "
              >
                <div className="relative aspect-[16/9]">
                  <Image
                    src={c.cover}
                    alt={c.name}
                    fill
                    sizes="(max-width:639px) 100vw, 420px"
                    className="object-contain bg-white transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-col justify-center gap-2 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
                    {String(i + 1).padStart(2, '0')} · {count} ürün
                  </span>
                  <h3 className="text-lg font-bold text-ink">
                    {c.name}
                  </h3>
                  <p className="text-sm font-medium text-brand-500">{c.subtitle}</p>

                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
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
