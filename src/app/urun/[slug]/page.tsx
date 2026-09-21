import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProducts, getProductBySlug, getProductPreview } from '@/data/products';
import { getCategories } from '@/data/categories';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { ProductInfoTabs } from '@/components/product/ProductInfoTabs';
import { RelatedRail } from '@/components/product/RelatedRail';
import { RecentlyViewedSection, RecentlyViewedTracker } from '@/components/product/RecentlyViewedSection';
import { PreviewBanner } from '@/components/product/PreviewBanner';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd, productJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import type { ProductStatus } from '@/types/admin';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    // Panel önizlemesi (taslak/arşiv): başlık gösterilir ama asla dizinlenmez.
    const { isEnabled } = await draftMode();
    const preview = isEnabled ? await getProductPreview(slug) : undefined;
    return preview
      ? { title: `${preview.product.name} (önizleme)`, robots: { index: false, follow: false } }
      : {};
  }
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/urun/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images.map((i) => ({ url: i.src })),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [products, categories, { isEnabled: previewing }] = await Promise.all([
    getProducts(),
    getCategories(),
    draftMode(),
  ]);

  // Yayındaki ürün her zaman; yayında olmayan ürün YALNIZCA panelden açılan
  // önizlemede (Draft Mode çerezi) görünür. Çerez yoksa 404 — müşteri için fark yok.
  let product = products.find((p) => p.slug === slug);
  let previewStatus: ProductStatus | null = previewing && product ? 'yayında' : null;
  if (!product && previewing) {
    const preview = await getProductPreview(slug);
    if (preview) {
      product = preview.product;
      previewStatus = preview.status;
    }
  }
  if (!product) notFound();

  const category = categories.find((c) => c.slug === product.category);
  const related = product.relatedProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const similar = products
    .filter((p) => p.category === product.category && p.id !== product.id && !related.some((r) => r.id === p.id))
    .slice(0, 4);

  return (
    <div className="container-page section !pt-6 pb-28 lg:pb-16">
      <JsonLd data={productJsonLd(product, category?.name)} />
      <JsonLd
        data={breadcrumbJsonLd([
          ...(category ? [{ name: category.name, href: `/kategori/${category.slug}` }] : []),
          { name: product.name },
        ])}
      />
      {previewStatus ? (
        <PreviewBanner slug={product.slug} status={previewStatus} />
      ) : (
        <RecentlyViewedTracker slug={product.slug} />
      )}

      <Breadcrumbs
        items={[
          ...(category ? [{ label: category.name, href: `/kategori/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6">
        <ProductDetailClient product={product} />
      </div>

      <div className="mt-14 border-t border-line pt-10">
        <ProductInfoTabs product={product} />
      </div>

      <RelatedRail title="Bu aromayla iyi giden ürünler" products={related.slice(0, 4)} />
      <RelatedRail title="Birlikte sık tercih edilenler" products={[...related].reverse().slice(0, 4)} />
      <RelatedRail title="Benzer aromalar" products={similar} />
      <RecentlyViewedSection excludeSlug={product.slug} />

    </div>
  );
}
