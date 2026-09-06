// Katalog üzerinde saf mutasyonlar. Route Handler'lar bunları çağırır;
// her biri yeni bir CatalogFile döndürür (veya AdminError fırlatır).

import type {
  AdminCategory,
  AdminCollection,
  AdminProduct,
  CatalogFile,
  ProductListResult,
  ProductStatus,
} from '@/types/admin';
import {
  adminCategorySchema,
  adminCollectionSchema,
  adminProductSchema,
  fieldErrors,
} from './schema';
import { ensureSingleDefault, generateMatrix } from './variants';

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly issues: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------- ürünler ----

/** Kayıt öncesi ürünü normalize eder: varyant matrisi + tek varsayılan. */
export function normalizeProduct(input: AdminProduct): AdminProduct {
  const variants = ensureSingleDefault(
    generateMatrix(input.options, input.variants),
    input.variants,
  );
  return { ...input, variants };
}

function validateProduct(product: AdminProduct): AdminProduct {
  const parsed = adminProductSchema.safeParse(product);
  if (!parsed.success) {
    throw new AdminError('Ürün doğrulaması başarısız', 422, fieldErrors(parsed.error));
  }
  return parsed.data as AdminProduct;
}

export function createProduct(catalog: CatalogFile, input: AdminProduct): {
  catalog: CatalogFile;
  product: AdminProduct;
} {
  const next = clone(catalog);
  const stamp = now();
  const candidate = normalizeProduct({
    ...input,
    createdAt: stamp,
    updatedAt: stamp,
  });

  if (next.products.some((p) => p.slug === candidate.slug)) {
    throw new AdminError('Bu slug zaten kullanımda', 409, { slug: 'Bu slug zaten kullanımda' });
  }
  if (next.products.some((p) => p.id === candidate.id)) {
    candidate.id = `${candidate.slug}-${Date.now().toString(36)}`;
  }
  assertCategoriesExist(next, candidate);

  const product = validateProduct(candidate);
  next.products.push(product);
  return { catalog: next, product };
}

export function updateProduct(
  catalog: CatalogFile,
  id: string,
  patch: Partial<AdminProduct>,
): { catalog: CatalogFile; product: AdminProduct } {
  const next = clone(catalog);
  const index = next.products.findIndex((p) => p.id === id);
  if (index === -1) throw new AdminError('Ürün bulunamadı', 404);

  const merged: AdminProduct = {
    ...next.products[index],
    ...patch,
    id: next.products[index].id,
    createdAt: next.products[index].createdAt,
    updatedAt: now(),
  };

  if (
    merged.slug !== next.products[index].slug &&
    next.products.some((p) => p.slug === merged.slug && p.id !== id)
  ) {
    throw new AdminError('Bu slug zaten kullanımda', 409, { slug: 'Bu slug zaten kullanımda' });
  }
  assertCategoriesExist(next, merged);

  const product = validateProduct(normalizeProduct(merged));
  next.products[index] = product;
  return { catalog: next, product };
}

export function deleteProduct(catalog: CatalogFile, id: string): CatalogFile {
  const next = clone(catalog);
  const before = next.products.length;
  next.products = next.products.filter((p) => p.id !== id);
  if (next.products.length === before) throw new AdminError('Ürün bulunamadı', 404);
  return next;
}

export type BulkAction =
  | { action: 'activate'; ids: string[] }
  | { action: 'deactivate'; ids: string[] }
  | { action: 'status'; ids: string[]; status: ProductStatus }
  | { action: 'category'; ids: string[]; categoryIds: string[] }
  | { action: 'delete'; ids: string[] };

export function bulkProducts(catalog: CatalogFile, op: BulkAction): CatalogFile {
  const next = clone(catalog);
  const idSet = new Set(op.ids);
  const stamp = now();

  if (op.action === 'delete') {
    next.products = next.products.filter((p) => !idSet.has(p.id));
    return next;
  }

  next.products = next.products.map((p) => {
    if (!idSet.has(p.id)) return p;
    if (op.action === 'activate') return { ...p, status: 'yayında', updatedAt: stamp };
    if (op.action === 'deactivate') return { ...p, status: 'taslak', updatedAt: stamp };
    if (op.action === 'status') return { ...p, status: op.status, updatedAt: stamp };
    if (op.action === 'category') {
      const valid = op.categoryIds.filter((cid) => next.categories.some((c) => c.id === cid));
      if (valid.length === 0) throw new AdminError('Geçerli kategori seçilmedi', 422);
      return { ...p, categoryIds: valid, updatedAt: stamp };
    }
    return p;
  });
  return next;
}

function assertCategoriesExist(catalog: CatalogFile, product: AdminProduct): void {
  const missing = product.categoryIds.filter((cid) => !catalog.categories.some((c) => c.id === cid));
  if (missing.length > 0) {
    throw new AdminError(`Bilinmeyen kategori: ${missing.join(', ')}`, 422, {
      categoryIds: 'Seçilen kategori bulunamadı',
    });
  }
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  collectionId?: string;
  status?: ProductStatus | 'all';
  sort?: 'updated' | 'name' | 'price' | 'stock';
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function listProducts(catalog: CatalogFile, query: ProductQuery): ProductListResult {
  const {
    search = '',
    categoryId,
    collectionId,
    status = 'all',
    sort = 'updated',
    dir = 'desc',
    page = 1,
    pageSize = 20,
  } = query;

  const term = search.trim().toLocaleLowerCase('tr');
  let items = catalog.products.filter((p) => {
    if (status !== 'all' && p.status !== status) return false;
    if (categoryId && !p.categoryIds.includes(categoryId)) return false;
    if (collectionId && !p.collectionIds.includes(collectionId)) return false;
    if (term) {
      const haystack = [
        p.name,
        p.slug,
        p.series,
        p.subcategory,
        ...p.tags,
        ...p.variants.map((v) => v.sku),
      ]
        .join(' ')
        .toLocaleLowerCase('tr');
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const minPrice = (p: AdminProduct) =>
    Math.min(...p.variants.filter((v) => v.isActive).map((v) => v.priceMinor).concat(Infinity));
  const totalStock = (p: AdminProduct) =>
    p.variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0);

  const factor = dir === 'asc' ? 1 : -1;
  items = [...items].sort((a, b) => {
    switch (sort) {
      case 'name':
        return factor * a.name.localeCompare(b.name, 'tr');
      case 'price':
        return factor * (minPrice(a) - minPrice(b));
      case 'stock':
        return factor * (totalStock(a) - totalStock(b));
      default:
        return factor * (Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
    }
  });

  const total = items.length;
  const size = Math.max(1, Math.min(200, pageSize));
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * size;

  return {
    items: items.slice(start, start + size),
    total,
    page: current,
    pageSize: size,
    pageCount,
  };
}

// ----------------------------------------------------------- kategoriler ----

export function upsertCategory(
  catalog: CatalogFile,
  input: AdminCategory,
): { catalog: CatalogFile; category: AdminCategory } {
  const parsed = adminCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new AdminError('Kategori doğrulaması başarısız', 422, fieldErrors(parsed.error));
  }
  const category = parsed.data as AdminCategory;
  const next = clone(catalog);
  const index = next.categories.findIndex((c) => c.id === category.id);

  if (next.categories.some((c) => c.slug === category.slug && c.id !== category.id)) {
    throw new AdminError('Bu slug zaten kullanımda', 409, { slug: 'Bu slug zaten kullanımda' });
  }

  if (index === -1) {
    category.order = next.categories.length;
    next.categories.push(category);
  } else {
    next.categories[index] = { ...category, order: next.categories[index].order };
  }
  return { catalog: next, category };
}

export function deleteCategory(catalog: CatalogFile, id: string): CatalogFile {
  const next = clone(catalog);
  const target = next.categories.find((c) => c.id === id);
  if (!target) throw new AdminError('Kategori bulunamadı', 404);

  const used = next.products.filter((p) => p.categoryIds.includes(id));
  const orphans = used.filter((p) => p.categoryIds.length === 1);
  if (orphans.length > 0) {
    throw new AdminError(
      `Bu kategori ${orphans.length} üründe tek kategori; önce başka kategori atayın`,
      409,
    );
  }
  next.categories = next.categories.filter((c) => c.id !== id);
  next.products = next.products.map((p) =>
    p.categoryIds.includes(id)
      ? { ...p, categoryIds: p.categoryIds.filter((cid) => cid !== id) }
      : p,
  );
  next.categories.forEach((c, i) => {
    c.order = i;
  });
  return next;
}

export function reorderCategories(catalog: CatalogFile, orderedIds: string[]): CatalogFile {
  return reorder(catalog, 'categories', orderedIds);
}

// ---------------------------------------------------------- koleksiyonlar ----

export function upsertCollection(
  catalog: CatalogFile,
  input: AdminCollection,
): { catalog: CatalogFile; collection: AdminCollection } {
  const parsed = adminCollectionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AdminError('Koleksiyon doğrulaması başarısız', 422, fieldErrors(parsed.error));
  }
  const collection = parsed.data as AdminCollection;
  const next = clone(catalog);
  const index = next.collections.findIndex((c) => c.id === collection.id);

  if (next.collections.some((c) => c.slug === collection.slug && c.id !== collection.id)) {
    throw new AdminError('Bu slug zaten kullanımda', 409, { slug: 'Bu slug zaten kullanımda' });
  }

  if (index === -1) {
    collection.order = next.collections.length;
    next.collections.push(collection);
  } else {
    next.collections[index] = { ...collection, order: next.collections[index].order };
  }
  return { catalog: next, collection };
}

export function deleteCollection(catalog: CatalogFile, id: string): CatalogFile {
  const next = clone(catalog);
  if (!next.collections.some((c) => c.id === id)) {
    throw new AdminError('Koleksiyon bulunamadı', 404);
  }
  next.collections = next.collections.filter((c) => c.id !== id);
  next.products = next.products.map((p) =>
    p.collectionIds.includes(id)
      ? { ...p, collectionIds: p.collectionIds.filter((cid) => cid !== id) }
      : p,
  );
  next.collections.forEach((c, i) => {
    c.order = i;
  });
  return next;
}

export function reorderCollections(catalog: CatalogFile, orderedIds: string[]): CatalogFile {
  return reorder(catalog, 'collections', orderedIds);
}

function reorder(
  catalog: CatalogFile,
  key: 'categories' | 'collections',
  orderedIds: string[],
): CatalogFile {
  const next = clone(catalog);
  const list = next[key] as Array<{ id: string; order: number }>;
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  list.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  list.forEach((item, i) => {
    item.order = i;
  });
  return next;
}
