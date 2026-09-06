// Katalog yazma katmanı — `src/lib/admin/store.ts` (dosya yazımı) yerine geçer.
//
// TASARIM: Doğrulama ve normalizasyon mantığı `src/lib/admin/mutations.ts`
// içindeki SAF fonksiyonlarda kalır (slug tekilliği, varyant matrisi, tek
// varsayılan varyant, kategori varlığı). Route Handler'lar şu akışı izler:
//
//   1. `readCatalog()`   → veritabanından tam katalog (doğrulama bağlamı)
//   2. saf mutasyon      → yeni CatalogFile + etkilenen kayıt
//   3. `saveProduct(...)`→ YALNIZCA etkilenen kaydı veritabanına yazar
//
// Böylece davranış dosya tabanlı sürümle birebir aynı kalır ama yazma
// dar kapsamlıdır: varyant kimlikleri (ve onlara bağlı stok hareketleri)
// gereksiz yere silinmez.

import 'server-only';
import type {
  AdminCategory,
  AdminCollection,
  AdminProduct,
  CatalogFile,
} from '@/types/admin';
import { CATALOG_SCHEMA_VERSION } from '@/types/admin';
import { db } from '../db';
import {
  categoryScalars,
  collectionScalars,
  productInclude,
  productScalars,
  rowToCategory,
  rowToCollection,
  rowToProduct,
  type ProductRow,
} from './mapping';
import { revalidateCatalog } from './queries';

/** Veritabanındaki kataloğun tamamı — saf mutasyonların çalışma bağlamı. */
export async function readCatalog(): Promise<CatalogFile> {
  const [products, categories, collections] = await Promise.all([
    db.product.findMany({ include: productInclude, orderBy: { createdAt: 'asc' } }),
    db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.collection.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    products: (products as unknown as ProductRow[]).map(rowToProduct),
    categories: categories.map(rowToCategory),
    collections: collections.map(rowToCollection),
  };
}

// ------------------------------------------------------------------ ürün ----

/**
 * Ürünü ve alt kayıtlarını yazar.
 *
 * Varyantlar `id` üzerinden upsert edilir; artık bulunmayanlar silinir. Bu
 * önemlidir: `StockMovement` ve `OrderItem` varyant kimliğine bağlıdır, o
 * yüzden "hepsini sil, yeniden yaz" yapılmaz.
 */
export async function saveProduct(product: AdminProduct): Promise<void> {
  const scalars = productScalars(product);

  await db.$transaction(async (tx) => {
    await tx.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        ...scalars,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      },
      update: { ...scalars, updatedAt: new Date(product.updatedAt) },
    });

    // --- görseller: kimliğe göre upsert, kalanları sil
    const imageIds = product.images.map((i) => i.id);
    await tx.productImage.deleteMany({
      where: { productId: product.id, id: { notIn: imageIds.length ? imageIds : ['__yok__'] } },
    });
    for (const [i, img] of product.images.entries()) {
      await tx.productImage.upsert({
        where: { id: img.id },
        create: { id: img.id, productId: product.id, src: img.src, alt: img.alt, position: i },
        update: { src: img.src, alt: img.alt, position: i },
      });
    }

    // --- seçenekler: ürün içi `localId` ile eşleştirilir
    const optionLocalIds = product.options.map((o) => o.id);
    await tx.productOption.deleteMany({
      where: {
        productId: product.id,
        localId: { notIn: optionLocalIds.length ? optionLocalIds : ['__yok__'] },
      },
    });

    for (const [i, opt] of product.options.entries()) {
      const savedOption = await tx.productOption.upsert({
        where: { productId_localId: { productId: product.id, localId: opt.id } },
        create: { productId: product.id, localId: opt.id, name: opt.name, position: i },
        update: { name: opt.name, position: i },
      });

      const valueLocalIds = opt.values.map((v) => v.id);
      await tx.optionValue.deleteMany({
        where: {
          optionId: savedOption.id,
          localId: { notIn: valueLocalIds.length ? valueLocalIds : ['__yok__'] },
        },
      });
      for (const [vi, val] of opt.values.entries()) {
        await tx.optionValue.upsert({
          where: { optionId_localId: { optionId: savedOption.id, localId: val.id } },
          create: { optionId: savedOption.id, localId: val.id, label: val.label, position: vi },
          update: { label: val.label, position: vi },
        });
      }
    }

    // --- varyantlar
    const variantIds = product.variants.map((v) => v.id);
    await tx.variant.deleteMany({
      where: {
        productId: product.id,
        id: { notIn: variantIds.length ? variantIds : ['__yok__'] },
      },
    });
    for (const [i, v] of product.variants.entries()) {
      const data = {
        comboKey: v.comboKey,
        optionValues: v.optionValues,
        sku: v.sku,
        priceMinor: v.priceMinor,
        compareAtPriceMinor: v.compareAtPriceMinor,
        stock: v.stock,
        barcode: v.barcode,
        image: v.image,
        isDefault: v.isDefault,
        isActive: v.isActive,
        position: i,
      };
      await tx.variant.upsert({
        where: { id: v.id },
        create: { id: v.id, productId: product.id, ...data },
        update: data,
      });
    }

    // --- kategori / koleksiyon bağları (sıra korunur: position 0 birincildir)
    await tx.productCategory.deleteMany({ where: { productId: product.id } });
    if (product.categoryIds.length) {
      await tx.productCategory.createMany({
        data: product.categoryIds.map((categoryId, i) => ({
          productId: product.id,
          categoryId,
          position: i,
        })),
      });
    }

    await tx.productCollection.deleteMany({ where: { productId: product.id } });
    if (product.collectionIds.length) {
      await tx.productCollection.createMany({
        data: product.collectionIds.map((collectionId, i) => ({
          productId: product.id,
          collectionId,
          position: i,
        })),
      });
    }
  });

  revalidateCatalog();
}

/** Toplu işlemler için — yalnız değişen ürünleri yazar. */
export async function saveProducts(products: AdminProduct[]): Promise<void> {
  for (const p of products) await saveProduct(p);
}

export async function removeProduct(id: string): Promise<void> {
  // Alt kayıtlar `onDelete: Cascade` ile birlikte silinir.
  await db.product.delete({ where: { id } });
  revalidateCatalog();
}

// -------------------------------------------------------------- taksonomi ---

export async function saveCategory(category: AdminCategory): Promise<void> {
  const data = categoryScalars(category);
  await db.category.upsert({
    where: { id: category.id },
    create: { id: category.id, ...data },
    update: data,
  });
  revalidateCatalog();
}

export async function removeCategory(id: string): Promise<void> {
  await db.category.delete({ where: { id } });
  revalidateCatalog();
}

export async function saveCollection(collection: AdminCollection): Promise<void> {
  const data = collectionScalars(collection);
  await db.collection.upsert({
    where: { id: collection.id },
    create: { id: collection.id, ...data },
    update: data,
  });
  revalidateCatalog();
}

export async function removeCollection(id: string): Promise<void> {
  await db.collection.delete({ where: { id } });
  revalidateCatalog();
}

/** Sıralamayı toplu yazar (sürükle-bırak sonrası). */
export async function saveCategoryOrder(categories: AdminCategory[]): Promise<void> {
  await db.$transaction(
    categories.map((c) =>
      db.category.update({ where: { id: c.id }, data: { sortOrder: c.order } }),
    ),
  );
  revalidateCatalog();
}

export async function saveCollectionOrder(collections: AdminCollection[]): Promise<void> {
  await db.$transaction(
    collections.map((c) =>
      db.collection.update({ where: { id: c.id }, data: { sortOrder: c.order } }),
    ),
  );
  revalidateCatalog();
}

/**
 * Tüm kataloğu yazar — YALNIZCA içe aktarma (JSON yükleme) için.
 * Ürünlerin alt kayıtları kimliğe göre eşleştirilir; kaynakta olmayanlar silinir.
 */
export async function replaceCatalog(next: CatalogFile): Promise<void> {
  const keepProducts = next.products.map((p) => p.id);
  const keepCategories = next.categories.map((c) => c.id);
  const keepCollections = next.collections.map((c) => c.id);

  for (const c of next.categories) await saveCategory(c);
  for (const c of next.collections) await saveCollection(c);
  for (const p of next.products) await saveProduct(p);

  await db.product.deleteMany({
    where: { id: { notIn: keepProducts.length ? keepProducts : ['__yok__'] } },
  });
  await db.category.deleteMany({
    where: { id: { notIn: keepCategories.length ? keepCategories : ['__yok__'] } },
  });
  await db.collection.deleteMany({
    where: { id: { notIn: keepCollections.length ? keepCollections : ['__yok__'] } },
  });

  revalidateCatalog();
}
