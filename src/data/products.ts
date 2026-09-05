// Vitrin ürün verisi. Kaynak: src/data/catalog.json (admin paneli tarafından yönetilir).
// Bu modülün dışa verdiği isimler ve tipler DEĞİŞMEZ — vitrin bileşenleri bunlara bağlı.

import type { FlavorProfile, Product } from '@/types';
import { adminProducts } from './catalog';
import { toStorefrontProduct } from './catalog-adapter';

// Yalnızca "yayında" ürünler vitrinde görünür.
export const products: Product[] = adminProducts
  .filter((p) => p.status === 'yayında')
  .map(toStorefrontProduct);

// İlgili ürünleri kategori + profil yakınlığına göre doldur (önceki davranışla aynı).
for (const p of products) {
  const scored = products
    .filter((o) => o.id !== p.id)
    .map((o) => {
      let score = 0;
      if (o.category === p.category) score += 3;
      if (o.collection && o.collection === p.collection) score += 2;
      score += o.flavorProfiles.filter((fp) => p.flavorProfiles.includes(fp)).length;
      return { id: o.id, score };
    })
    .sort((a, b) => b.score - a.score);
  p.relatedProductIds = scored.slice(0, 4).map((s) => s.id);
}

// ---- yardımcı sorgular ----
export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const productsByCategory = (slug: string) => products.filter((p) => p.category === slug);
export const productsByCollection = (slug: string) => products.filter((p) => p.collection === slug);
export const bestSellers = () => products.filter((p) => p.bestSeller);
export const newArrivals = () => products.filter((p) => p.newArrival);
export const onSaleProducts = () => products.filter((p) => p.variants.some((v) => v.onSale));
export const featuredProducts = () => products.filter((p) => p.featured);

export const priceRange = (() => {
  const all = products.flatMap((p) => p.variants.map((v) => v.price));
  if (all.length === 0) return { min: 0, max: 0 };
  return { min: Math.floor(Math.min(...all)), max: Math.ceil(Math.max(...all)) };
})();

export function productsByProfile(profile: FlavorProfile) {
  return products.filter((p) => p.flavorProfiles.includes(profile));
}
