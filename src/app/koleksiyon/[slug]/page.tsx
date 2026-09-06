import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCollections, getCollectionBySlug } from '@/data/categories';
import { getProductsByCollection } from '@/data/products';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description,
    alternates: { canonical: `/koleksiyon/${c.slug}` },
    openGraph: { images: [{ url: c.cover }] },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) notFound();
  const list = await getProductsByCollection(c.slug);

  return (
    <div>
      <section className="surface-dark relative overflow-hidden">
        <div className="grain absolute inset-0" aria-hidden />
        <Image src={c.cover} alt="" fill sizes="100vw" priority className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900 via-purple-900/60 to-purple-900/30" />
        <div className="container-page relative py-24 sm:py-32">
          <Breadcrumbs items={[{ label: 'Koleksiyonlar', href: '/urunler' }, { label: c.name }]} className="[&_*]:text-cream/70 [&_span[aria-current]]:text-cream" />
          <span className="mt-6 inline-block rounded-full border border-gold-200/30 bg-gold-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-200">
            Signature Collection
          </span>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold text-cream sm:text-5xl">{c.name}</h1>
          <p className="mt-3 max-w-lg text-lg text-cream/80">{c.subtitle}</p>
          <p className="mt-4 max-w-xl text-sm text-cream/60">{c.description}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-cream/40">{c.atmosphere}</p>
        </div>
      </section>

      <div className="container-page section !pt-10">
        <Suspense fallback={<ProductGridSkeleton count={6} />}>
          <ProductBrowser baseProducts={list} emptyTitle="Bu koleksiyonda ürün bulunamadı" />
        </Suspense>
      </div>
    </div>
  );
}
