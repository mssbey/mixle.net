import { describe, expect, it } from 'vitest';
import type { AdminCategory, AdminProduct, CatalogFile } from '@/types/admin';
import {
  AdminError,
  categoryDescendantIds,
  categoryTree,
  deleteCategory,
  duplicateProduct,
  listProducts,
  upsertCategory,
} from './mutations';

function cat(id: string, parentId: string | null = null, order = 0): AdminCategory {
  return {
    id,
    slug: id,
    name: id.toUpperCase(),
    tagline: '',
    description: '',
    cover: '',
    icon: '',
    subcategories: [],
    parentId,
    accent: 'purple',
    order,
  };
}

function product(id: string, categoryIds: string[]): AdminProduct {
  const stamp = '2026-01-01T00:00:00.000Z';
  return {
    id,
    slug: id,
    name: id.toUpperCase(),
    series: 'Seri',
    shortDescription: 'Kısa açıklama',
    description: '',
    subcategory: '',
    categoryIds,
    collectionIds: [],
    tags: ['etiket'],
    images: [{ id: 'img-1', src: '/images/a.webp', alt: 'a' }],
    status: 'yayında',
    seo: { title: 'SEO', description: '' },
    flavorNotes: [],
    flavorProfiles: [],
    badges: [],
    featured: false,
    bestSeller: false,
    newArrival: false,
    taste: { sweetness: 5, freshness: 5, intensity: 5, sourness: 5, creaminess: 5 },
    form: 'konsantre',
    usageRate: '',
    steepTime: '',
    origin: '',
    faq: [],
    options: [
      { id: 'opt-1', name: 'Hacim', values: [{ id: 'val-1', label: '10ml' }], order: 0 },
    ],
    variants: [
      {
        id: 'var-1',
        comboKey: 'opt-1:val-1',
        optionValues: { 'opt-1': 'val-1' },
        sku: 'SKU-1',
        priceMinor: 12990,
        compareAtPriceMinor: null,
        stock: 4,
        barcode: '869000',
        image: null,
        isDefault: true,
        isActive: true,
      },
    ],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function catalog(categories: AdminCategory[], products: AdminProduct[] = []): CatalogFile {
  return { schemaVersion: 1, updatedAt: '2026-01-01T00:00:00.000Z', categories, products, collections: [] };
}

describe('kategori ağacı', () => {
  const tree = [cat('ana', null, 0), cat('alt', 'ana', 1), cat('torun', 'alt', 2), cat('diger', null, 3)];

  it('alt ağacı kendisiyle birlikte döndürür', () => {
    expect(categoryDescendantIds(tree, 'ana')).toEqual(['ana', 'alt', 'torun']);
    expect(categoryDescendantIds(tree, 'diger')).toEqual(['diger']);
  });

  it('düzleştirmede üst hemen ardından altları gelir', () => {
    expect(categoryTree(tree).map(({ category, depth }) => [category.id, depth])).toEqual([
      ['ana', 0],
      ['alt', 1],
      ['torun', 2],
      ['diger', 0],
    ]);
  });

  it('kendi alt kategorisini üst kategori olarak kabul etmez', () => {
    expect(() => upsertCategory(catalog(tree), { ...tree[0], parentId: 'torun' })).toThrow(AdminError);
    expect(() => upsertCategory(catalog(tree), { ...tree[0], parentId: 'ana' })).toThrow(AdminError);
  });

  it('bilinmeyen üst kategoriyi reddeder', () => {
    expect(() => upsertCategory(catalog(tree), { ...tree[3], parentId: 'yok' })).toThrow(AdminError);
  });

  it('geçerli üst kategoriyi kaydeder', () => {
    const { category } = upsertCategory(catalog(tree), { ...tree[3], parentId: 'ana' });
    expect(category.parentId).toBe('ana');
  });

  it('silinen kategorinin altlarını bir üst seviyeye taşır', () => {
    const next = deleteCategory(catalog(tree), 'alt');
    expect(next.categories.find((c) => c.id === 'torun')?.parentId).toBe('ana');
  });

  it('kök kategori silinince altları köke çıkar', () => {
    const next = deleteCategory(catalog(tree), 'ana');
    expect(next.categories.find((c) => c.id === 'alt')?.parentId).toBeNull();
  });

  it('üst kategori filtresi alt kategorilerdeki ürünleri de kapsar', () => {
    const data = catalog(tree, [product('a', ['torun']), product('b', ['diger'])]);
    expect(listProducts(data, { categoryId: 'ana' }).items.map((p) => p.id)).toEqual(['a']);
    expect(listProducts(data, { categoryId: 'torun' }).items.map((p) => p.id)).toEqual(['a']);
    expect(listProducts(data, { categoryId: 'diger' }).items.map((p) => p.id)).toEqual(['b']);
  });
});

describe('ürün çoğaltma (WordPress "Çoğalt")', () => {
  const base = catalog([cat('ana')], [product('mango', ['ana'])]);

  it('taslak kopya üretir, slug ve adı numaralandırır', () => {
    const { product: copy } = duplicateProduct(base, 'mango');
    expect(copy.slug).toBe('mango-kopya');
    expect(copy.name).toBe('MANGO (Kopya)');
    expect(copy.status).toBe('taslak');
    expect(copy.id).not.toBe('mango');
  });

  it('slug doluysa sıradaki boş numarayı seçer', () => {
    const withCopy = catalog(
      [cat('ana')],
      [product('mango', ['ana']), { ...product('mango-kopya', ['ana']), id: 'k1' }],
    );
    const { product: copy } = duplicateProduct(withCopy, 'mango');
    expect(copy.slug).toBe('mango-kopya-2');
    expect(copy.name).toBe('MANGO (Kopya 2)');
  });

  it('görsel, seçenek ve varyantlara yeni kimlik verir', () => {
    const { product: copy } = duplicateProduct(base, 'mango');
    const source = base.products[0];
    expect(copy.images[0].id).not.toBe(source.images[0].id);
    expect(copy.options[0].id).not.toBe(source.options[0].id);
    expect(copy.variants[0].id).not.toBe(source.variants[0].id);
    // Varyant eşleşmesi yeni seçenek kimliklerine göre yeniden kurulur.
    expect(Object.keys(copy.variants[0].optionValues)).toEqual([copy.options[0].id]);
    expect(copy.variants[0].optionValues[copy.options[0].id]).toBe(copy.options[0].values[0].id);
    expect(copy.variants[0].comboKey).toContain(copy.options[0].id);
  });

  it('SKU ve barkodu çakışmayacak biçimde devralır', () => {
    const { product: copy } = duplicateProduct(base, 'mango');
    expect(copy.variants[0].sku).toBe('SKU-1-KOPYA');
    expect(copy.variants[0].barcode).toBeNull();
    expect(copy.variants[0].priceMinor).toBe(12990);
    expect(copy.variants[0].stock).toBe(4);
  });

  it('kaynağı değiştirmez', () => {
    duplicateProduct(base, 'mango');
    expect(base.products).toHaveLength(1);
    expect(base.products[0].status).toBe('yayında');
  });

  it('bilinmeyen ürün için 404 verir', () => {
    expect(() => duplicateProduct(base, 'yok')).toThrow(AdminError);
  });
});
