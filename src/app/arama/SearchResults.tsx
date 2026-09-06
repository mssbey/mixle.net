'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { searchProducts, popularSearches } from '@/lib/search';
import { useCategories, useSlimProducts } from '@/components/catalog/CatalogProvider';
import { ProductBrowser } from '@/components/commerce/ProductBrowser';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';

export function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const categories = useCategories();
  const { products: catalog } = useSlimProducts();
  const hits = useMemo(
    () => (q ? searchProducts(q, catalog, categories, 60) : []),
    [q, catalog, categories],
  );
  const products = hits.map((h) => h.product);

  if (!q) {
    return (
      <EmptyState
        icon={SearchX}
        title="Aramak istediğiniz ürünü yazın"
        description="Üst menüdeki arama çubuğunu kullanarak aroma adı, kategori veya tat notu arayabilirsiniz."
        className="mt-6"
      />
    );
  }

  return (
    <>
      <h1 className="mt-4 text-display-sm">“{q}” için sonuçlar</h1>
      <p className="mt-2 text-ink-soft">{products.length} ürün bulundu.</p>

      {products.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={SearchX}
            title="Sonuç bulunamadı"
            description="Farklı bir arama terimi deneyin veya popüler aramalardan birine göz atın."
          />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {popularSearches.map((t) => (
              <Link key={t} href={`/arama?q=${encodeURIComponent(t)}`} className="chip hover:border-purple-400">
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-8">
          <ProductBrowser key={q} baseProducts={products} />
        </div>
      )}
    </>
  );
}
