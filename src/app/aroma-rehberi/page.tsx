import type { Metadata } from 'next';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { guideTopics, guideDisclaimer } from '@/data/content';
import { AromaFinder } from '@/components/home/AromaFinder';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getProducts } from '@/data/products';

export const metadata: Metadata = {
  title: 'Aroma Rehberi',
  description:
    'Aroma türleri, tat profili okuma, yoğunluk/ferahlık seviyeleri, saklama ve bekleme süresi hakkında bilgilendirici rehber.',
  alternates: { canonical: '/aroma-rehberi' },
};

const images = ['/images/showcase/tfa-citrus-punch.webp', '/images/showcase/inawera-vanilla.webp', '/images/showcase/tfa-rainbow-sherbet.webp', '/images/showcase/tfa-cucumber.webp'];

export default async function GuidePage() {
  const products = await getProducts();
  return (
    <div>
      <section className="surface-dark relative overflow-hidden">
        <div className="grain absolute inset-0" aria-hidden />
        <div className="container-page relative py-16 sm:py-24">
          <Breadcrumbs items={[{ label: 'Aroma Rehberi' }]} className="[&_*]:text-cream/70 [&_span[aria-current]]:text-cream" />
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold-200/30 bg-gold-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-200">
            <BookOpen size={13} /> Aroma Rehberi
          </span>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold text-cream sm:text-5xl">
            Doğru seçim için bilmen gerekenler
          </h1>
          <p className="mt-3 max-w-xl text-cream/75">
            Aroma türlerinden tat profili okumaya, saklamadan bekleme süresine kadar temel bilgiler.
          </p>
        </div>
      </section>

      <div className="container-page section grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-14">
          {guideTopics.map((t, i) => (
            <article key={t.slug} id={t.slug} className="scroll-mt-32 border-t border-purple-100 pt-10 first:border-t-0 first:pt-0">
              <div className="grid gap-6 sm:grid-cols-[1fr_1.4fr] sm:items-center">
                {i % 2 === 0 ? (
                  <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-2xl sm:order-1">
                    <Image src={images[i % images.length]} alt="Aroma rehberi için temsili kompozisyon" fill sizes="(max-width:768px) 100vw, 400px" className="object-cover" />
                  </div>
                ) : null}
                <div className={i % 2 === 0 ? 'order-1 sm:order-2' : ''}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-purple-900">{t.title}</h2>
                  <p className="mt-1 text-sm font-medium text-purple-600">{t.summary}</p>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
                    {t.body.map((p, k) => (
                      <p key={k}>{p}</p>
                    ))}
                  </div>
                </div>
                {i % 2 !== 0 && (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={images[i % images.length]} alt="" fill sizes="(max-width:768px) 100vw, 400px" className="object-cover" />
                  </div>
                )}
              </div>
            </article>
          ))}

          <div className="rounded-2xl border border-dashed border-gold-300 bg-gold-50/50 p-5 text-xs leading-relaxed text-ink-soft">
            {guideDisclaimer}
          </div>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:h-fit">
          <div className="rounded-2xl border border-purple-100 bg-white p-5">
            <h3 className="font-display text-sm font-semibold text-purple-800">Bu sayfada</h3>
            <ul className="mt-3 space-y-2">
              {guideTopics.map((t) => (
                <li key={t.slug}>
                  <a href={`#${t.slug}`} className="text-sm text-ink-soft transition-colors hover:text-purple-700">
                    {t.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div id="bulucu" className="mt-6 scroll-mt-32">
            <AromaFinder products={products} compact />
          </div>
        </aside>
      </div>
    </div>
  );
}
