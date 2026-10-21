import type { Category, Product } from '@/types';

const norm = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();

export interface SearchHit {
  product: Product;
  score: number;
}

interface IndexedProduct {
  product: Product;
  name: string;
  cat: string;
  notes: string;
  series: string;
  desc: string;
}

// Normalize edilmiş metinler ürün dizisi başına bir kez hesaplanır; her tuş
// vuruşunda yüzlerce ürünü yeniden normalize etmek mobilde takılma yapıyordu.
const indexCache = new WeakMap<Product[], { categories: Category[]; index: IndexedProduct[] }>();

function getIndex(products: Product[], categories: Category[]): IndexedProduct[] {
  const cached = indexCache.get(products);
  if (cached && cached.categories === categories) return cached.index;
  const catNames = new Map(categories.map((c) => [c.slug, norm(c.name)]));
  const index = products.map((product) => ({
    product,
    name: norm(product.name),
    cat: catNames.get(product.category) ?? '',
    notes: norm(product.flavorNotes.map((f) => f.label).join(' ')),
    series: norm(product.series + ' ' + product.subcategory),
    desc: norm(product.shortDescription),
  }));
  indexCache.set(products, { categories, index });
  return index;
}

/**
 * Saf arama: veri parametreyle gelir. Böylece hem sunucu bileşeni (/arama) hem
 * de client bileşeni (SearchOverlay) aynı sıralama mantığını kullanır.
 */
export function searchProducts(
  query: string,
  products: Product[],
  categories: Category[],
  limit = 24,
): SearchHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const hits: SearchHit[] = [];
  for (const { product, name, cat, notes, series, desc } of getIndex(products, categories)) {
    let score = 0;
    for (const t of terms) {
      if (name.startsWith(t)) score += 12;
      else if (name.includes(t)) score += 8;
      if (cat.includes(t)) score += 5;
      if (notes.includes(t)) score += 4;
      if (series.includes(t)) score += 3;
      if (desc.includes(t)) score += 1;
    }
    if (score > 0) hits.push({ product, score });
  }

  return hits.sort((a, b) => b.score - a.score || b.product.rating - a.product.rating).slice(0, limit);
}

export const popularSearches = [
  'Buzlu meyve',
  'Karamel',
  'Tüt..',
  'Limonata',
  'Mango',
  'DIY kit',
  'Mentol',
  'Kahve',
];
