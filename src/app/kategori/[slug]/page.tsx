import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getCategories, getCategoryBySlug, getChildCategories } from '@/data/categories';
import { getCategoryCards, getProductsByCategory } from '@/data/products';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { SubcategoryGrid } from '@/components/catalog/SubcategoryGrid';

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
  const [list, children, parent] = await Promise.all([
    getProductsByCategory(cat.slug),
    getChildCategories(cat.slug),
    cat.parentSlug ? getCategoryBySlug(cat.parentSlug) : Promise.resolve(undefined),
  ]);

  // Alt kategorisi olan ana kategori, ürün listesi yerine alt kategori
  // kartlarını gösterir.
  const subcategoryCards = await getCategoryCards(children);
  // Hiçbir alt kategoriye bağlı olmayan ürünler ana kategoride listelenmeye devam eder.
  const inChildren = new Set(subcategoryCards.flatMap((c) => c.products.map((p) => p.id)));
  const directProducts = children.length > 0 ? list.filter((p) => !inChildren.has(p.id)) : list;

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          ...(parent ? [{ name: parent.name, href: `/kategori/${parent.slug}` }] : []),
          { name: cat.name, href: `/kategori/${cat.slug}` },
        ])}
      />
      <div className="border-b border-line bg-mist">
        <div className="container-page py-6">
          <Breadcrumbs
            items={
              parent
                ? [{ label: parent.name, href: `/kategori/${parent.slug}` }, { label: cat.name }]
                : [{ label: cat.name }]
            }
          />
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
              {/* Alt kategoriler ayrı kategorilerdir; kendi sayfalarına bağlanır.
                  Ağaç kurulmamış eski kayıtlarda serbest metin etiketleri gösterilir. */}
              {children.length === 0 &&
                cat.subcategories.length > 0 && (
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

      {subcategoryCards.length > 0 && (
        <div className="container-page section !pt-8">
          <SubcategoryGrid items={subcategoryCards} />
        </div>
      )}

      {(children.length === 0 || directProducts.length > 0) && (
        <div className={children.length > 0 ? 'container-page section !pt-0' : 'container-page section !pt-8'}>
          {children.length > 0 && <h2 className="store-section-title mb-5">Diğer {cat.name} ürünleri</h2>}
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <ProductBrowser
              baseProducts={directProducts}
              lockCategory
              emptyTitle="Bu kategoride sonuç yok"
              emptyDescription="Filtreleri temizleyerek diğer ürünleri görebilirsiniz."
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
