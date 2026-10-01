// Toplu fiyat güncelleme: seçili ürünler / kategoriler (alt kategoriler dahil) /
// tüm ürünler için fiyatı yüzde ya da tutar olarak düşürme / artırma, ya da
// eski üstü çizili indirimleri kaldırma.
//
// 900+ ürünü `saveProduct` ile tek tek yazmak uzak veritabanında dakikalar
// sürer; burada yalnızca varyant fiyat sütunları tek SQL ile güncellenir.

import { handle, readJson } from '@/lib/admin/http';
import { adjustPrice, priceAdjustSchema, withDescendants } from '@/lib/admin/pricing';
import { db } from '@/server/db';
import { revalidateCatalog } from '@/server/catalog/queries';
import { writeAudit } from '@/server/audit';
import { Prisma } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

const CHUNK = 500;

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const input = priceAdjustSchema.parse(await readJson<unknown>(request));

    let where: Prisma.ProductWhereInput = {};
    if (input.scope === 'secili') where = { id: { in: input.ids } };
    if (input.scope === 'kategori') {
      const all = await db.category.findMany({ select: { id: true, parentId: true } });
      where = { categories: { some: { categoryId: { in: withDescendants(all, input.categoryIds) } } } };
    }

    const variants = await db.variant.findMany({
      where: { product: where },
      select: { id: true, productId: true, priceMinor: true, compareAtPriceMinor: true },
    });

    let skipped = 0;
    const changes: { v: (typeof variants)[number]; next: { priceMinor: number; compareAtPriceMinor: number | null } }[] = [];
    for (const v of variants) {
      const next = adjustPrice(v, input);
      if (!next) {
        if (v.priceMinor > 0) skipped += 1;
        continue;
      }
      if (next.priceMinor !== v.priceMinor || next.compareAtPriceMinor !== v.compareAtPriceMinor) changes.push({ v, next });
    }
    const productIds = [...new Set(changes.map((c) => c.v.productId))];
    // Önizlemede örnek: ilk değişecek varyantın önce/sonra fiyatı.
    const sample = changes[0] ? { before: changes[0].v.priceMinor, after: changes[0].next.priceMinor } : null;

    if (input.dryRun) {
      return Response.json({ ok: true, products: productIds.length, variants: changes.length, skipped, sample });
    }

    for (let i = 0; i < changes.length; i += CHUNK) {
      const rows = changes
        .slice(i, i + CHUNK)
        .map(({ v, next }) => Prisma.sql`(${v.id}, ${next.priceMinor}::int, ${next.compareAtPriceMinor}::int)`);
      await db.$executeRaw`
        UPDATE "Variant" AS v
        SET "priceMinor" = x.p, "compareAtPriceMinor" = x.c, "updatedAt" = now()
        FROM (VALUES ${Prisma.join(rows)}) AS x(id, p, c)
        WHERE v.id = x.id`;
    }
    if (productIds.length) {
      await db.product.updateMany({ where: { id: { in: productIds } }, data: { updatedAt: new Date() } });
    }
    revalidateCatalog();

    await writeAudit({
      user,
      action: 'guncelle',
      entityType: 'Product',
      entityId: productIds.join(',').slice(0, 5000),
      diff: {
        topluFiyat: {
          before: null,
          after: `${input.mode} ${input.valueType === 'yuzde' ? `%${input.value}` : `${input.value} ₺`}${input.roundUp ? ' (üste yuvarla)' : ''} · ${input.scope} · ${productIds.length} ürün / ${changes.length} varyant`,
        },
      },
    });

    return Response.json({ ok: true, products: productIds.length, variants: changes.length, skipped, sample });
  });
}
