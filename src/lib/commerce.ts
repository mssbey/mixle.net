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

export function uniqueOptions(product: Product) {
  const order = ['10ml', '30ml', '60ml', '100ml'];
  return {
    volumes: Array.from(new Set(product.variants.map((v) => v.volume))).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b),
    ),
    types: Array.from(new Set(product.variants.map((v) => v.type))),
    intensities: Array.from(new Set(product.variants.map((v) => v.intensity))),
  };
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
