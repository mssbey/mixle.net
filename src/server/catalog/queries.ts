// Vitrin katalog okumaları — veritabanından, önbellekli.
//
// Önbellek stratejisi (Next.js 16, `cacheComponents` KAPALI):
//   - `unstable_cache` + `revalidateTag` — belgelerin bu yapılandırma için
//     önerdiği yol (bkz. node_modules/next/dist/docs/01-app/02-guides/
//     caching-without-cache-components.md). `cacheComponents` açılırsa buradaki
//     sarmalayıcılar `'use cache'` + `cacheTag` ile değiştirilir; çağrı yerleri
//     değişmez.
//   - React `cache()` aynı istek içindeki tekrar çağrıları teker.
//   - Panelden her yazma sonrası `revalidateCatalog()` çağrılır.

import 'server-only';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { AdminCategory, AdminCollection, AdminProduct } from '@/types/admin';
import { db } from '../db';
import {
  productInclude,
  rowToCategory,
  rowToCollection,
  rowToProduct,
  type ProductRow,
} from './mapping';

/** Katalog önbellek etiketi — yazma uçları bunu geçersiz kılar. */
export const CATALOG_TAG = 'katalog';

interface CatalogData {
  products: AdminProduct[];
  categories: AdminCategory[];
  collections: AdminCollection[];
}

const loadCatalog = unstable_cache(
  async (): Promise<CatalogData> => {
    const [products, categories, collections] = await Promise.all([
      db.product.findMany({ include: productInclude, orderBy: { createdAt: 'asc' } }),
      db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.collection.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    return {
      products: (products as unknown as ProductRow[]).map(rowToProduct),
      categories: categories.map(rowToCategory),
      collections: collections.map(rowToCollection),
    };
  },
  ['katalog-tam'],
  { tags: [CATALOG_TAG] },
);

/** Tüm katalog (admin modeli). İstek başına teklenir, istekler arası önbelleklenir. */
export const getCatalogData = cache(loadCatalog);

export async function getAdminProducts(): Promise<AdminProduct[]> {
  return (await getCatalogData()).products;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return (await getCatalogData()).categories;
}

export async function getAdminCollections(): Promise<AdminCollection[]> {
  return (await getCatalogData()).collections;
}

/**
 * Katalog önbelleğini geçersiz kılar. Panelden yapılan HER yazma işleminden
 * sonra çağrılmalıdır; yoksa vitrin eski veriyi göstermeye devam eder.
 */
export function revalidateCatalog(): void {
  revalidateTag(CATALOG_TAG, 'max');
}
