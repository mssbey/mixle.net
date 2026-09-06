'use client';

import { useEffect, useState } from 'react';
import { useRecentlyViewed } from '@/store/favorites';
import { useSlimProducts } from '@/components/catalog/CatalogProvider';
import { RelatedRail } from './RelatedRail';
import type { Product } from '@/types';

export function RecentlyViewedTracker({ slug }: { slug: string }) {
  const push = useRecentlyViewed((s) => s.push);
  useEffect(() => {
    push(slug);
  }, [slug, push]);
  return null;
}

export function RecentlyViewedSection({ excludeSlug }: { excludeSlug?: string }) {
  const ids = useRecentlyViewed((s) => s.ids);
  // Geçmiş boşsa katalog hiç indirilmez.
  const { products: catalog } = useSlimProducts(ids.length > 0);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const list = ids
      .filter((id) => id !== excludeSlug)
      .map((id) => catalog.find((p) => p.slug === id))
      .filter((p): p is Product => !!p)
      .slice(0, 8);
    setProducts(list);
  }, [ids, excludeSlug, catalog]);

  if (!products.length) return null;
  return <RelatedRail title="Son Görüntülenen Ürünler" products={products} />;
}
