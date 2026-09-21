// Vitrin ürün verisi. Kaynak: veritabanı (Prisma) — eskiden catalog.json'du.
//
// SUNUCU-ONLY. Client bileşenleri artık bu modülü import EDEMEZ; onlar veriyi
// ya sunucu bileşeninden prop olarak ya da `CatalogProvider` / `/api/catalog/slim`
// üzerinden alır. `server-only` bu kuralı derleme anında zorlar.
//
// Sözleşme değişikliği: eskiden `products` senkron bir diziydi. Veritabanı
// okuması asenkron olduğu için karşılıkları `get*` fonksiyonlarıdır. Dönen
// `Product` tipi ve alan anlamları AYNIDIR — vitrin bileşenleri değişmedi.

import 'server-only';
import { cache } from 'react';
import type { FlavorProfile, Product } from '@/types';
import type { ProductStatus } from '@/types/admin';
import { getAdminProducts } from '@/server/catalog/queries';
import { toStorefrontProduct } from './catalog-adapter';

/**
 * Yayındaki ürünler, vitrin tipine indirgenmiş ve ilgili ürünleri doldurulmuş.
 * `cache()` sayesinde bir istek içinde birden çok kez çağrılsa da tek kez hesaplanır.
 */
export const getProducts = cache(async (): Promise<Product[]> => {
  const admin = await getAdminProducts();
  const products = admin.filter((p) => p.status === 'yayında').map(toStorefrontProduct);

  // İlgili ürünleri kategori + profil yakınlığına göre doldur (önceki davranışla aynı).
  for (const p of products) {
    const scored = products
      .filter((o) => o.id !== p.id)
      .map((o) => {
        let score = 0;
        if (o.category === p.category) score += 3;
        if (o.collection && o.collection === p.collection) score += 2;
        score += o.flavorProfiles.filter((fp) => p.flavorProfiles.includes(fp)).length;
        // Tükenmiş ürünler önerilerde en sona düşsün.
        if (o.stockStatus === 'out-of-stock') score -= 5;
        return { id: o.id, score };
      })
      .sort((a, b) => b.score - a.score);
    p.relatedProductIds = scored.slice(0, 4).map((s) => s.id);
  }

  return products;
});

/**
 * Panel önizlemesi: ürünü yayın durumuna BAKMADAN vitrin tipine çevirir.
 * Yalnızca Draft Mode açıkken (bkz. /api/admin/preview) çağrılmalıdır; aksi
 * hâlde taslak/arşiv ürünler herkese açılır. İlgili ürünler yayındakilerden seçilir.
 */
export const getProductPreview = cache(
  async (slug: string): Promise<{ product: Product; status: ProductStatus } | undefined> => {
    const admin = (await getAdminProducts()).find((p) => p.slug === slug);
    if (!admin) return undefined;
    const product = toStorefrontProduct(admin);
    const published = await getProducts();
    product.relatedProductIds = published
      .filter((o) => o.id !== product.id)
      .map((o) => ({
        id: o.id,
        score:
          (o.category === product.category ? 3 : 0) +
          (o.collection && o.collection === product.collection ? 2 : 0) +
          o.flavorProfiles.filter((fp) => product.flavorProfiles.includes(fp)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.id);
    return { product, status: admin.status };
  },
);

// ---- yardımcı sorgular (eski senkron karşılıklarıyla aynı anlamda) ----

export const getProductBySlug = async (slug: string): Promise<Product | undefined> =>
  (await getProducts()).find((p) => p.slug === slug);

export const getProductsByCategory = async (slug: string): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.category === slug);

export const getProductsByCollection = async (slug: string): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.collection === slug);

export const getBestSellers = async (): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.bestSeller);

export const getNewArrivals = async (): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.newArrival);

export const getOnSaleProducts = async (): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.variants.some((v) => v.onSale));

export const getFeaturedProducts = async (): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.featured);

export const getProductsByProfile = async (profile: FlavorProfile): Promise<Product[]> =>
  (await getProducts()).filter((p) => p.flavorProfiles.includes(profile));

/** Filtre kaydırıcısının uçları — TL cinsinden (vitrin sözleşmesi). */
export const getPriceRange = async (): Promise<{ min: number; max: number }> => {
  const all = (await getProducts()).flatMap((p) => p.variants.map((v) => v.price));
  if (all.length === 0) return { min: 0, max: 0 };
  return { min: Math.floor(Math.min(...all)), max: Math.ceil(Math.max(...all)) };
};
