import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { getProducts } from '@/data/products';
import { getCategories, getCollections } from '@/data/categories';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [products, categories, collections] = await Promise.all([
    getProducts(),
    getCategories(),
    getCollections(),
  ]);
  const staticPaths = [
    '',
    '/urunler',
    '/yeni-gelenler',
    '/kampanyalar',
    '/aroma-rehberi',
    '/hakkimizda',
    '/sss',
    '/iletisim',
    '/gizlilik-politikasi',
    '/mesafeli-satis-sozlesmesi',
    '/iade-ve-teslimat',
    '/cerez-politikasi',
  ];

  return [
    ...staticPaths.map((p) => ({
      url: `${site.domain}${p}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : 0.7,
    })),
    ...categories.map((c) => ({
      url: `${site.domain}/kategori/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...collections.map((c) => ({
      url: `${site.domain}/koleksiyon/${c.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...products.map((p) => ({
      url: `${site.domain}/urun/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];
}
