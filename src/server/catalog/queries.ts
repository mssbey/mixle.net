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
import { loadProductRows } from './load';
import {
  rowToCategory,
  rowToCollection,
  rowToProduct,
} from './mapping';

/** Katalog önbellek etiketi — yazma uçları bunu geçersiz kılar. */
export const CATALOG_TAG = 'katalog';

interface CatalogData {
  products: AdminProduct[];
  categories: AdminCategory[];
  collections: AdminCollection[];
}

async function readCatalogFromDb(): Promise<CatalogData> {
  const [products, categories, collections] = await Promise.all([
    loadProductRows(),
    db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.collection.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return {
    products: products.map(rowToProduct),
    categories: categories.map(rowToCategory),
    collections: collections.map(rowToCollection),
  };
}

/**
 * `next build` sırasında süreç (worker) başına TEK okuma.
 *
 * Katalog JSON'u 2 MB'ı aştığı için Next'in veri önbelleği onu saklayamıyor
 * ("items over 2MB can not be cached"); `unstable_cache` her statik sayfada
 * veritabanına yeniden iniyordu — yüzlerce sayfa × 7 sorgu, uzak veritabanının
 * bağlantı kotasını dolduruyordu. Build'de veri zaten değişmez; bellekte tutulur.
 * Çalışma zamanında bu yol KULLANILMAZ; tazelik `revalidateTag` ile korunur.
 */
let buildTimeCatalog: Promise<CatalogData> | null = null;

const loadCatalog = unstable_cache(
  (): Promise<CatalogData> => {
    if (process.env.NEXT_PHASE !== 'phase-production-build') return readCatalogFromDb();
    buildTimeCatalog ??= readCatalogFromDb().catch((err: unknown) => {
      buildTimeCatalog = null;
      throw err;
    });
    return buildTimeCatalog;
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
 * Tek ürünü slug ile ÖNBELLEKSİZ okur.
 *
 * Panel önizlemesi için gerekli: yeni oluşturulan/çoğaltılan ürün, katalog
 * önbelleği henüz tazelenmemişken de görünmelidir. `revalidateTag` bir sonraki
 * istekte hemen görünür olmayabiliyor (sunucusuz ortamda örnekler arası
 * tutarlılık gecikmeli), bu yüzden önizleme yolu önbelleğe hiç uğramaz.
 * Tek ürünlük sorgu olduğu için maliyeti de düşüktür.
 */
export const getAdminProductBySlugFresh = cache(
  async (slug: string): Promise<AdminProduct | undefined> => {
    const rows = await loadProductRows({ slug });
    return rows[0] ? rowToProduct(rows[0]) : undefined;
  },
);

/**
 * Katalog önbelleğini geçersiz kılar. Panelden yapılan HER yazma işleminden
 * sonra çağrılmalıdır; yoksa vitrin eski veriyi göstermeye devam eder.
 */
export function revalidateCatalog(): void {
  revalidateTag(CATALOG_TAG, 'max');
}
