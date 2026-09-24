// Ürün çöp kutusu.
//
// Silme: ürünün tam anlık görüntüsü (`AdminProduct`) `ProductTrash`'e yazılır,
// ardından ürün katalogdan kaldırılır. Vitrin sorguları hiç değişmez — ürün
// gerçekten `Product` tablosunda yoktur.
//
// Geri yükleme: anlık görüntü `saveProduct` ile AYNI kimliklerle yeniden
// yazılır; böylece varyant kimliğine bağlı sipariş kalemleri yeniden eşleşir.
// Arada silinen kategoriler düşürülür, slug başka ürüne verilmişse sonuna ek
// alır. Ürün her zaman TASLAK olarak döner — kontrol edilmeden yayına girmez.

import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import type { AdminProduct } from '@/types/admin';
import { db } from '../db';
import { saveProduct } from './persist';
import { revalidateCatalog } from './queries';

/** Çöpteki ürün bu kadar gün sonra kalıcı silinir. */
export const TRASH_RETENTION_DAYS = 30;

export class TrashError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 409 | 422 = 422,
  ) {
    super(message);
    this.name = 'TrashError';
  }
}

export interface TrashItemView {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  categoryIds: string[];
  variantCount: number;
  deletedBy: string | null;
  deletedAt: string;
  purgeAt: string;
}

/** Ürünleri çöpe taşır (tek transaction'da kopyala + sil). */
export async function trashProducts(products: AdminProduct[], deletedBy: string | null): Promise<void> {
  if (!products.length) return;
  await db.$transaction([
    ...products.map((p) =>
      db.productTrash.upsert({
        where: { id: p.id },
        create: { id: p.id, slug: p.slug, name: p.name, snapshot: p as unknown as Prisma.InputJsonValue, deletedBy },
        update: { slug: p.slug, name: p.name, snapshot: p as unknown as Prisma.InputJsonValue, deletedBy, deletedAt: new Date() },
      }),
    ),
    // Alt kayıtlar `onDelete: Cascade` ile birlikte silinir.
    db.product.deleteMany({ where: { id: { in: products.map((p) => p.id) } } }),
  ]);
  revalidateCatalog();
}

/** Süresi dolanları temizler — liste açılırken tembel çalışır. */
async function purgeExpired(): Promise<void> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000);
  await db.productTrash.deleteMany({ where: { deletedAt: { lt: cutoff } } });
}

export async function listTrash(): Promise<TrashItemView[]> {
  await purgeExpired();
  const rows = await db.productTrash.findMany({ orderBy: { deletedAt: 'desc' } });
  return rows.map((r) => {
    const p = r.snapshot as unknown as AdminProduct;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      image: p.images?.[0]?.src ?? null,
      categoryIds: p.categoryIds ?? [],
      variantCount: p.variants?.length ?? 0,
      deletedBy: r.deletedBy,
      deletedAt: r.deletedAt.toISOString(),
      purgeAt: new Date(r.deletedAt.getTime() + TRASH_RETENTION_DAYS * 86_400_000).toISOString(),
    };
  });
}

export async function restoreFromTrash(id: string): Promise<AdminProduct> {
  const row = await db.productTrash.findUnique({ where: { id } });
  if (!row) throw new TrashError('Çöp kutusunda böyle bir ürün yok.', 404);
  if (await db.product.findUnique({ where: { id }, select: { id: true } })) {
    throw new TrashError('Bu kimlikle bir ürün zaten katalogda var.', 409);
  }

  const snap = row.snapshot as unknown as AdminProduct;
  const [categories, collections] = await Promise.all([
    db.category.findMany({ where: { id: { in: snap.categoryIds ?? [] } }, select: { id: true } }),
    db.collection.findMany({ where: { id: { in: snap.collectionIds ?? [] } }, select: { id: true } }),
  ]);
  const liveCats = new Set(categories.map((c) => c.id));
  const liveCols = new Set(collections.map((c) => c.id));

  let slug = snap.slug;
  for (let n = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${snap.slug}-${n}`;
  }

  const product: AdminProduct = {
    ...snap,
    slug,
    status: 'taslak',
    categoryIds: (snap.categoryIds ?? []).filter((c) => liveCats.has(c)),
    collectionIds: (snap.collectionIds ?? []).filter((c) => liveCols.has(c)),
    updatedAt: new Date().toISOString(),
  };

  await saveProduct(product);
  await db.productTrash.delete({ where: { id } });
  return product;
}

export async function purgeFromTrash(ids: string[] | 'all'): Promise<number> {
  const r = await db.productTrash.deleteMany(ids === 'all' ? undefined : { where: { id: { in: ids } } });
  return r.count;
}
