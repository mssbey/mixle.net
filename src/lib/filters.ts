import type { Product, FlavorProfile } from '@/types';

export type SortKey =
  | 'onerilen'
  | 'yeniler'
  | 'cok-satan'
  | 'fiyat-artan'
  | 'fiyat-azalan'
  | 'puan'
  | 'indirim';

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'onerilen', label: 'Önerilen' },
  { key: 'yeniler', label: 'En yeniler' },
  { key: 'cok-satan', label: 'Çok satanlar' },
  { key: 'fiyat-artan', label: 'Fiyat: artan' },
  { key: 'fiyat-azalan', label: 'Fiyat: azalan' },
  { key: 'puan', label: 'En yüksek puan' },
  { key: 'indirim', label: 'İndirim oranı' },
];

export interface FilterState {
  categories: string[];
  subcategories: string[];
  series: string[];
  profiles: FlavorProfile[];
  forms: string[];
  volumes: string[];
  freshness: [number, number];
  sweetness: [number, number];
  price: [number, number];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  newOnly: boolean;
  bestSellerOnly: boolean;
  sort: SortKey;
}

export const formLabels: Record<string, string> = {
  konsantre: 'Konsantre Aroma',
  shortfill: 'Shortfill',
  'diy-kit': 'DIY Kit',
  baz: 'Baz / Nbase',
};

export const profileLabels: Record<FlavorProfile, string> = {
  meyveli: 'Meyveli',
  ferah: 'Ferah',
  tatli: 'Tatlı',
  eksi: 'Ekşi',
  kremsi: 'Kremsi',
  tutun: 'Tütün',
  icecek: 'İçecek',
  mentollu: 'Mentollü',
};

function minVariantPrice(p: Product) {
  return Math.min(...p.variants.map((v) => v.price));
}
function maxDiscount(p: Product) {
  return Math.max(
    0,
    ...p.variants.map((v) => (v.oldPrice ? Math.round((1 - v.price / v.oldPrice) * 100) : 0)),
  );
}

export function applyFilters(source: Product[], f: FilterState): Product[] {
  let list = source.filter((p) => {
    if (f.categories.length && !f.categories.includes(p.category)) return false;
    if (f.subcategories.length && !f.subcategories.includes(p.subcategory)) return false;
    if (f.series.length && !f.series.includes(p.series)) return false;
    if (f.profiles.length && !f.profiles.some((pr) => p.flavorProfiles.includes(pr))) return false;
    if (f.forms.length && !f.forms.includes(p.form)) return false;
    if (f.volumes.length && !p.variants.some((v) => f.volumes.includes(v.volume))) return false;
    if (p.taste.freshness < f.freshness[0] || p.taste.freshness > f.freshness[1]) return false;
    if (p.taste.sweetness < f.sweetness[0] || p.taste.sweetness > f.sweetness[1]) return false;
    const price = minVariantPrice(p);
    if (price < f.price[0] || price > f.price[1]) return false;
    if (f.inStockOnly && p.stockStatus === 'out-of-stock') return false;
    if (f.onSaleOnly && !p.variants.some((v) => v.onSale)) return false;
    if (f.newOnly && !p.newArrival) return false;
    if (f.bestSellerOnly && !p.bestSeller) return false;
    return true;
  });

  const byNew = (a: Product, b: Product) => Number(b.newArrival) - Number(a.newArrival);
  switch (f.sort) {
    case 'yeniler':
      list = [...list].sort(byNew);
      break;
    case 'cok-satan':
      list = [...list].sort(
        (a, b) => Number(b.bestSeller) - Number(a.bestSeller) || b.reviewCount - a.reviewCount,
      );
      break;
    case 'fiyat-artan':
      list = [...list].sort((a, b) => minVariantPrice(a) - minVariantPrice(b));
      break;
    case 'fiyat-azalan':
      list = [...list].sort((a, b) => minVariantPrice(b) - minVariantPrice(a));
      break;
    case 'puan':
      list = [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'indirim':
      list = [...list].sort((a, b) => maxDiscount(b) - maxDiscount(a));
      break;
    default:
      list = [...list].sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          Number(b.bestSeller) - Number(a.bestSeller) ||
          b.rating - a.rating,
      );
  }
  return list;
}

export function defaultFilters(priceMin: number, priceMax: number): FilterState {
  return {
    categories: [],
    subcategories: [],
    series: [],
    profiles: [],
    forms: [],
    volumes: [],
    freshness: [0, 10],
    sweetness: [0, 10],
    price: [priceMin, priceMax],
    inStockOnly: false,
    onSaleOnly: false,
    newOnly: false,
    bestSellerOnly: false,
    sort: 'onerilen',
  };
}

export const allSeries = (products: Product[]) =>
  Array.from(new Set(products.map((p) => p.series))).sort();

export const allSubcategories = (products: Product[]) =>
  Array.from(new Set(products.map((p) => p.subcategory))).sort((a, b) => a.localeCompare(b, 'tr'));
