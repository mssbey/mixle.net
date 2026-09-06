// Vitrin kategori/koleksiyon verisi. Kaynak: veritabanı (Prisma).
//
// SUNUCU-ONLY — bkz. `src/data/products.ts` başındaki açıklama. Client
// bileşenleri taksonomiyi `useTaxonomy()` (CatalogProvider) üzerinden alır.

import 'server-only';
import { cache } from 'react';
import type { Category, Collection } from '@/types';
import { getAdminCategories, getAdminCollections } from '@/server/catalog/queries';
import { toStorefrontCategory, toStorefrontCollection } from './catalog-adapter';

export const getCategories = cache(async (): Promise<Category[]> =>
  (await getAdminCategories()).map(toStorefrontCategory),
);

export const getCollections = cache(async (): Promise<Collection[]> =>
  (await getAdminCollections()).map(toStorefrontCollection),
);

export const getCategoryBySlug = async (slug: string): Promise<Category | undefined> =>
  (await getCategories()).find((c) => c.slug === slug);

export const getCollectionBySlug = async (slug: string): Promise<Collection | undefined> =>
  (await getCollections()).find((c) => c.slug === slug);

/** Kök layout'un `CatalogProvider`'a verdiği küçük taksonomi paketi. */
export const getTaxonomy = cache(async (): Promise<{
  categories: Category[];
  collections: Collection[];
}> => {
  const [categories, collections] = await Promise.all([getCategories(), getCollections()]);
  return { categories, collections };
});
