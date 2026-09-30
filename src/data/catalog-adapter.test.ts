import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminProduct } from '@/types/admin';
import { taxonomySlugMap, toStorefrontProduct } from './catalog-adapter';

function product(patch: Partial<AdminProduct>): AdminProduct {
  return {
    id: 'p1', slug: 'p1', name: 'P1', series: '', shortDescription: '', description: '', subcategory: '',
    categoryIds: ['c1'], collectionIds: [], tags: [], images: [], status: 'yayında',
    seo: { title: '', description: '' }, flavorNotes: [], flavorProfiles: [], badges: [],
    featured: false, bestSeller: false, newArrival: false, newFrom: null, newUntil: null,
    taste: { sweetness: 0, freshness: 0, intensity: 0, sourness: 0, creaminess: 0 },
    form: 'konsantre', usageRate: '', steepTime: '', origin: '', faq: [], options: [],
    variants: [{ id: 'v1', comboKey: '', optionValues: {}, sku: '', priceMinor: 1000, compareAtPriceMinor: null,
      stock: 10, barcode: null, image: null, isDefault: true, isActive: true }],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

describe('"Yeni" damgası tarih aralığı (vitrin)', () => {
  afterEach(() => vi.useRealTimers());

  it('tarih yoksa "Yeni gelen" işareti rozeti belirler', () => {
    const p = toStorefrontProduct(product({ badges: [], newArrival: true }));
    expect(p.badges).toEqual(['yeni']);
    expect(p.newArrival).toBe(true);
  });

  it('"Yeni gelen" işaretsizse elle eklenmiş eski rozet gösterilmez', () => {
    const p = toStorefrontProduct(product({ badges: ['yeni', 'cok-satan'], newArrival: false }));
    expect(p.badges).toEqual(['cok-satan']);
    expect(p.newArrival).toBe(false);
  });

  it('aralık içindeyse rozet eklenir ve Yeni Gelenler’e girer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    const p = toStorefrontProduct(product({ newFrom: '2026-10-01', newUntil: '2026-10-07', badges: ['cok-satan'] }));
    expect(p.badges).toEqual(['yeni', 'cok-satan']);
    expect(p.newArrival).toBe(true);
  });

  it('aralık dışındaysa elle eklenmiş rozet de gizlenir', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    const p = toStorefrontProduct(product({ newFrom: '2026-10-01', newUntil: '2026-10-07', badges: ['yeni'], newArrival: true }));
    expect(p.badges).toEqual([]);
    expect(p.newArrival).toBe(false);
  });
});

describe('kategori/koleksiyon bağları (vitrin)', () => {
  const cat = (id: string, slug: string) => ({ id, slug }) as never;

  it('ürün bağlı olduğu tüm kategorileri slug olarak taşır', () => {
    const slugs = taxonomySlugMap([cat('mix-aromalar', 'mix-aromalar'), cat('cat-x1', 'pastane')], []);
    const p = toStorefrontProduct(product({ categoryIds: ['mix-aromalar', 'cat-x1'] }), slugs);
    expect(p.category).toBe('mix-aromalar');
    expect(p.categories).toEqual(['mix-aromalar', 'pastane']);
  });

  it('silinmiş kategoriye kalan bağı atlar', () => {
    const slugs = taxonomySlugMap([cat('c2', 'c2')], []);
    const p = toStorefrontProduct(product({ categoryIds: ['yok', 'c2'] }), slugs);
    expect(p.categories).toEqual(['c2']);
    expect(p.category).toBe('c2');
  });

  it('tüm koleksiyonları slug olarak taşır', () => {
    const slugs = taxonomySlugMap([], [cat('col-1', 'yaz'), cat('col-2', 'kis')]);
    const p = toStorefrontProduct(product({ collectionIds: ['col-1', 'col-2'] }), slugs);
    expect(p.collection).toBe('yaz');
    expect(p.collections).toEqual(['yaz', 'kis']);
  });
});
