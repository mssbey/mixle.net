import type { Product, ProductVariant } from '@/types';

export function pickDefaultVariant(product: Product): ProductVariant {
  return (
    product.variants.find((v) => v.stock === 'in-stock') ??
    product.variants.find((v) => v.stock === 'low-stock') ??
    product.variants[0]
  );
}

/** Seçenek kimliği → değer kimliği. Ürün sayfasındaki seçimin tamamı. */
export type Selection = Record<string, string>;

/** Ürünün tüm seçeneklerinde `sel` ile birebir eşleşen varyant. */
export function findVariant(product: Product, sel: Selection): ProductVariant | undefined {
  return product.variants.find((v) => product.options.every((o) => v.selection[o.id] === sel[o.id]));
}

/** Seçime karşılık gelen varyant; eşleşme yoksa varsayılan varyant. */
export function variantFor(product: Product, sel: Selection): ProductVariant {
  return findVariant(product, sel) ?? pickDefaultVariant(product);
}

/** Sayfa açılışındaki seçim: varsayılan varyantın değerleri. */
export function initialSelection(product: Product): Selection {
  return { ...(pickDefaultVariant(product)?.selection ?? {}) };
}

/**
 * Bir değere tıklanınca yeni seçim. Tam kombinasyon varsa yalnız o seçenek
 * değişir; yoksa bu değeri taşıyan varyantlardan mevcut seçime en çok
 * benzeyeni (önce üstteki seçenekler, sonra stoktakiler) seçilir — müşteri
 * hiçbir zaman var olmayan bir kombinasyonda kalmaz.
 */
export function selectValue(product: Product, sel: Selection, optionId: string, valueId: string): Selection {
  const next = { ...sel, [optionId]: valueId };
  if (findVariant(product, next)) return next;
  const n = product.options.length;
  let best: ProductVariant | undefined;
  let bestScore = -1;
  for (const v of product.variants) {
    if (v.selection[optionId] !== valueId) continue;
    let score = v.stock === 'out-of-stock' ? 0 : 1;
    product.options.forEach((o, i) => {
      if (v.selection[o.id] === sel[o.id]) score += 2 ** (n - i + 1);
    });
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best ? { ...best.selection } : next;
}

/**
 * Bir değerin mevcut seçimdeki durumu: diğer seçenekler aynı kalırken o değere
 * geçilince hangi varyant olur (fiyatı ve stoğu butonda gösterilir).
 */
export function valueVariant(
  product: Product,
  sel: Selection,
  optionId: string,
  valueId: string,
): ProductVariant | undefined {
  return findVariant(product, { ...sel, [optionId]: valueId });
}

/**
 * Sepet/mini sepet satırında gösterilen varyant özeti: seçenek değerleri
 * ("250 ML / 3 Mg / %100 VG"). Tek varyantlı ürünlerde boş dönebilir.
 */
export function variantLabel(_product: Product, variant: ProductVariant): string {
  return variant.label || variant.volume;
}

/** Etiketleri başındaki ml değerine göre (10ml < 15ml < 30ml DIY Kit…) sıralar. */
export function sortVolumeLabels(labels: string[]): string[] {
  const ml = (s: string) => {
    const m = /(\d+(?:[.,]\d+)?)\s*ml/i.exec(s);
    return m ? parseFloat(m[1].replace(',', '.')) : Number.POSITIVE_INFINITY;
  };
  return [...labels].sort((a, b) => ml(a) - ml(b) || a.localeCompare(b, 'tr'));
}

export const stockLabel: Record<Product['stockStatus'], { text: string; className: string }> = {
  'in-stock': { text: 'Stokta', className: 'text-success' },
  'low-stock': { text: 'Son birkaç ürün', className: 'text-gold-600' },
  'out-of-stock': { text: 'Tükendi', className: 'text-brand-600' },
};
