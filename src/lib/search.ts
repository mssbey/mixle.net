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
  for (const product of products) {
    const haystackName = norm(product.name);
    const haystackCat = norm(categories.find((c) => c.slug === product.category)?.name ?? '');
    const haystackNotes = norm(product.flavorNotes.map((f) => f.label).join(' '));
    const haystackSeries = norm(product.series + ' ' + product.subcategory);
    const haystackDesc = norm(product.shortDescription);

    let score = 0;
    for (const t of terms) {
      if (haystackName.startsWith(t)) score += 12;
      else if (haystackName.includes(t)) score += 8;
      if (haystackCat.includes(t)) score += 5;
      if (haystackNotes.includes(t)) score += 4;
      if (haystackSeries.includes(t)) score += 3;
      if (haystackDesc.includes(t)) score += 1;
    }
    if (score > 0) hits.push({ product, score });
  }

  return hits.sort((a, b) => b.score - a.score || b.product.rating - a.product.rating).slice(0, limit);
}

export const popularSearches = [
  'Buzlu meyve',
  'Karamel',
  'Tütün',
  'Limonata',
  'Mango',
  'DIY kit',
  'Mentol',
  'Kahve',
];
