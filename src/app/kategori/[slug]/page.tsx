import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCategories, getCategoryBySlug } from '@/data/categories';
import { getProductsByCategory } from '@/data/products';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.description,
    alternates: { canonical: `/kategori/${cat.slug}` },
    openGraph: { images: [{ url: cat.cover }] },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const list = await getProductsByCategory(cat.slug);

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: cat.name, href: `/kategori/${cat.slug}` }])} />
      <section className="surface-dark relative overflow-hidden">
        <div className="grain absolute inset-0" aria-hidden />
        <Image src={cat.cover} alt="" fill sizes="100vw" className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-purple-900/85 to-purple-900/40" />
        <div className="container-page relative py-16 sm:py-20">
          <Breadcrumbs items={[{ label: cat.name }]} className="[&_*]:text-cream/70 [&_span[aria-current]]:text-cream" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold-200">{cat.tagline}</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold text-cream sm:text-4xl">{cat.name}</h1>
          <p className="mt-3 max-w-xl text-cream/75">{cat.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {cat.subcategories.map((s) => (
              <span key={s} className="rounded-full border border-cream/25 px-3 py-1 text-xs text-cream/85">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page section !pt-10">
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <ProductBrowser
            baseProducts={list}
            lockCategory
            emptyTitle="Bu kategoride sonuç yok"
            emptyDescription="Filtreleri temizleyerek diğer ürünleri görebilirsiniz."
          />
        </Suspense>
      </div>
    </div>
  );
}
