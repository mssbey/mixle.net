import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getProducts } from '@/data/products';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Tüm Aromalar',
  description: 'Meyveli, ferah, tatlı, tütün ve daha fazlası — Nefis Aroma kataloğundaki tüm aroma profillerini keşfedin.',
  alternates: { canonical: '/urunler' },
};

export default async function AllProductsPage() {
  const products = await getProducts();
  return (
    <div className="container-page section !pt-6">
      <Breadcrumbs items={[{ label: 'Tüm Aromalar' }]} />
      <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">Tüm Aromalar</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">
        {products.length} üründen oluşan kataloğumuzda kategoriye, tat profiline, forma ve fiyata göre filtreleyerek
        aradığınız aromayı bulun.
      </p>

      <div className="mt-6">
        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          <ProductBrowser baseProducts={products} />
        </Suspense>
      </div>
    </div>
  );
}
