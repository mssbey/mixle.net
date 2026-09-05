// Katalog verisinin tek kaynağı: src/data/catalog.json.
// Bu modül JSON'u tipli biçimde dışa verir. Vitrin tarafı için ağır doğrulama
// (Zod) burada çalışmaz; şema doğrulaması yazma anında sunucuda yapılır
// (src/lib/admin/store.ts). Admin API'si okurken de doğrular.

import catalogJson from './catalog.json';
import type {
  AdminCategory,
  AdminCollection,
  AdminProduct,
  CatalogFile,
} from '@/types/admin';

const catalog = catalogJson as unknown as CatalogFile;

export const catalogData: CatalogFile = catalog;
export const catalogUpdatedAt: string = catalog.updatedAt;
export const catalogSchemaVersion: number = catalog.schemaVersion;

export const adminProducts: AdminProduct[] = catalog.products;

export const adminCategories: AdminCategory[] = [...catalog.categories].sort(
  (a, b) => a.order - b.order,
);

export const adminCollections: AdminCollection[] = [...catalog.collections].sort(
  (a, b) => a.order - b.order,
);

export const adminProductBySlug = (slug: string): AdminProduct | undefined =>
  adminProducts.find((p) => p.slug === slug);

export const adminProductById = (id: string): AdminProduct | undefined =>
  adminProducts.find((p) => p.id === id);
