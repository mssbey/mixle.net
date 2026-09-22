// Vitrin kategori/koleksiyon verisi. Kaynak: veritabanı (Prisma).
//
// SUNUCU-ONLY — bkz. `src/data/products.ts` başındaki açıklama. Client
// bileşenleri taksonomiyi `useTaxonomy()` (CatalogProvider) üzerinden alır.

import 'server-only';
import { cache } from 'react';
import type { Category, Collection } from '@/types';
import { getAdminCategories, getAdminCollections } from '@/server/catalog/queries';
import { toStorefrontCategory, toStorefrontCollection } from './catalog-adapter';

export const getCategories = cache(async (): Promise<Category[]> => {
  const rows = await getAdminCategories();
  return rows.map((c) => toStorefrontCategory(c, rows));
});

/** Bir kategorinin doğrudan alt kategorileri (panel sırasına göre). */
export const getChildCategories = async (slug: string): Promise<Category[]> =>
  (await getCategories()).filter((c) => c.parentSlug === slug);

/**
 * Kategori ve tüm alt ağacının slug'ları. WordPress arşivlerinde olduğu gibi
 * üst kategori sayfası alt kategorilerdeki ürünleri de listeler.
 */
export const getCategoryTreeSlugs = async (slug: string): Promise<string[]> => {
  const all = await getCategories();
  const out = [slug];
  for (let i = 0; i < out.length; i += 1) {
    for (const c of all) {
      if (c.parentSlug === out[i] && !out.includes(c.slug)) out.push(c.slug);
    }
  }
  return out;
};

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
