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
      <div className="border-b border-line bg-mist">
        <div className="container-page py-6">
          <Breadcrumbs items={[{ label: cat.name }]} />
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              {cat.tagline && (
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-500">
                  {cat.tagline}
                </p>
              )}
              <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{cat.name}</h1>
              {cat.description && (
                <p className="mt-2 max-w-2xl text-sm text-ink-soft">{cat.description}</p>
              )}
              {cat.subcategories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cat.subcategories.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {cat.cover && (
              <div className="relative hidden h-28 w-64 shrink-0 overflow-hidden rounded-lg border border-line md:block">
                <Image src={cat.cover} alt="" fill sizes="256px" className="object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container-page section !pt-8">
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
