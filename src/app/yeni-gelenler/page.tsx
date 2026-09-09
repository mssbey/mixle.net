import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getNewArrivals } from '@/data/products';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Yeni Gelenler',
  description: 'Mixle kataloğuna son eklenen aroma profilleri.',
  alternates: { canonical: '/yeni-gelenler' },
};

export default async function NewArrivalsPage() {
  const list = await getNewArrivals();
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Yeni Gelenler' }]} />
      <h1 className="mt-4 text-display-sm">Yeni Gelenler</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Kataloğumuza son eklenen {list.length} aroma.</p>
      <div className="mt-8">
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <ProductBrowser baseProducts={list} emptyTitle="Şu anda yeni ürün yok" />
        </Suspense>
      </div>
    </div>
  );
}
