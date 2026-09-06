// Vitrin kataloğunun "hafif" projeksiyonu.
//
// NEDEN: Bazı client bileşenleri (sepet, favoriler, arama, son görüntülenenler)
// rastgele ürünleri kimliğe göre çözmek zorunda; hepsi localStorage'dan gelir,
// yani sunucu hangi ürünlerin gerekeceğini önceden bilemez. Eskiden bu yüzden
// TÜM katalog (527 KB) istemci paketine giriyordu.
//
// Çözüm: ürün kartını çizmeye yeten alanlar korunur, yalnızca ürün detay
// sayfasında kullanılan uzun metinler boşaltılır. Tip `Product` OLARAK KALIR —
// böylece ProductGrid/ProductRail/ProductCard imzaları hiç değişmez.

import type { Product } from '@/types';

/** Ürün kartı için gereksiz olan uzun alanları boşaltır. Tip değişmez. */
export function toSlimProduct(p: Product): Product {
  return {
    ...p,
    longDescription: '',
    ingredientsNote: '',
    usageRate: '',
    steepTime: '',
    storage: '',
    warnings: '',
    faq: [],
    // Kart en fazla iki görsel kullanır; galeri detay sayfasına özgüdür.
    gallery: p.images,
    relatedProductIds: [],
  };
}

export interface SlimCatalog {
  products: Product[];
}
