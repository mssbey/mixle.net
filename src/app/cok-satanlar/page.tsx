import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getBestSellers } from '@/data/products';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Çok Satanlar',
  description: 'Nefis Aroma müşterilerinin en çok tercih ettiği aroma profilleri.',
  alternates: { canonical: '/cok-satanlar' },
};

export default async function BestSellersPage() {
  const list = await getBestSellers();
  return (
    <div className="container-page section !pt-8">
      <Breadcrumbs items={[{ label: 'Çok Satanlar' }]} />
      <h1 className="mt-4 text-display-sm">Çok Satanlar</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Dengesi kanıtlanmış, en çok tercih edilen {list.length} profil.</p>
      <div className="mt-8">
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <ProductBrowser baseProducts={list} />
        </Suspense>
      </div>
    </div>
  );
}
