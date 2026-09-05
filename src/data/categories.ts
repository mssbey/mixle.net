// Vitrin kategori/koleksiyon verisi. Kaynak: src/data/catalog.json.
// Dışa verilen isimler ve tipler DEĞİŞMEZ.

import type { Category, Collection } from '@/types';
import { adminCategories, adminCollections } from './catalog';
import { toStorefrontCategory, toStorefrontCollection } from './catalog-adapter';

export const categories: Category[] = adminCategories.map(toStorefrontCategory);

export const collections: Collection[] = adminCollections.map(toStorefrontCollection);

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
export const collectionBySlug = (slug: string) => collections.find((c) => c.slug === slug);
