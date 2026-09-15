import type { Product, ProductVariant } from '@/types';

export function pickDefaultVariant(product: Product): ProductVariant {
  return (
    product.variants.find((v) => v.stock === 'in-stock') ??
    product.variants.find((v) => v.stock === 'low-stock') ??
    product.variants[0]
  );
}

export interface VariantSelection {
  volume?: string;
  type?: string;
  intensity?: string;
}

/** Seçime en yakın varyantı bul. Tam eşleşme yoksa öncelik sırasına göre gevşet. */
export function resolveVariant(product: Product, sel: VariantSelection): ProductVariant {
  const exact = product.variants.find(
    (v) =>
      (!sel.volume || v.volume === sel.volume) &&
      (!sel.type || v.type === sel.type) &&
      (!sel.intensity || v.intensity === sel.intensity),
  );
  if (exact) return exact;

  const byVolIntensity = product.variants.find(
    (v) =>
      (!sel.volume || v.volume === sel.volume) &&
      (!sel.intensity || v.intensity === sel.intensity),
  );
  if (byVolIntensity) return byVolIntensity;

  const byVol = product.variants.find((v) => !sel.volume || v.volume === sel.volume);
  return byVol ?? pickDefaultVariant(product);
}

/** Hacim etiketlerini paneldeki varyant sırasında, tekrarsız döner. */
export function uniqueOptions(product: Product) {
  return {
    volumes: Array.from(new Set(product.variants.map((v) => v.volume))),
    types: Array.from(new Set(product.variants.map((v) => v.type))),
    intensities: Array.from(new Set(product.variants.map((v) => v.intensity))),
  };
}

/**
 * Sepet/mini sepet satırında gösterilen varyant özeti: hacim etiketi, ürünün
 * birden fazla yoğunluğu varsa yoğunluk. Tek varyantlı ürünlerde boş dönebilir.
 */
export function variantLabel(product: Product, variant: ProductVariant): string {
  const { intensities } = uniqueOptions(product);
  return [variant.volume, intensities.length > 1 ? variant.intensity : '']
    .filter(Boolean)
    .join(' · ');
}

/** Etiketleri başındaki ml değerine göre (10ml < 15ml < 30ml DIY Kit…) sıralar. */
export function sortVolumeLabels(labels: string[]): string[] {
  const ml = (s: string) => {
    const m = /(\d+(?:[.,]\d+)?)\s*ml/i.exec(s);
    return m ? parseFloat(m[1].replace(',', '.')) : Number.POSITIVE_INFINITY;
  };
  return [...labels].sort((a, b) => ml(a) - ml(b) || a.localeCompare(b, 'tr'));
}

export function isOptionAvailable(
  product: Product,
  key: 'volume' | 'type' | 'intensity',
  value: string,
  sel: VariantSelection,
) {
  return product.variants.some(
    (v) =>
      v[key] === value &&
      v.stock !== 'out-of-stock' &&
      (key === 'volume' || !sel.volume || v.volume === sel.volume) &&
      (key === 'intensity' || !sel.intensity || v.intensity === sel.intensity) &&
      (key === 'type' || !sel.type || v.type === sel.type),
  );
}

export const stockLabel: Record<Product['stockStatus'], { text: string; className: string }> = {
  'in-stock': { text: 'Stokta', className: 'text-success' },
  'low-stock': { text: 'Son birkaç ürün', className: 'text-gold-600' },
  'out-of-stock': { text: 'Tükendi', className: 'text-brand-600' },
};
