// Kataloğu yeniden yükle — `src/data/catalog.seed.json` kaynağından.
//
// YIKICIDIR: mevcut katalog kayıtları silinir ve dosyadan yeniden
// yazılır. Sipariş/müşteri/kullanıcı tablolarına dokunmaz.
// Arayüz tarafında onay diyaloğu + geri alınamaz uyarısı gösterilir.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { handle } from '@/lib/admin/http';
import { AdminError } from '@/lib/admin/mutations';
import { legacyCatalogSchema, legacyToCatalog } from '@/server/catalog/import';
import { replaceCatalog } from '@/server/catalog/persist';
import { writeAudit } from '@/server/audit';

export const dynamic = 'force-dynamic';

export function POST(): Promise<Response> {
  return handle('bakim:yaz', async (user) => {
    const file = path.join(process.cwd(), 'src', 'data', 'catalog.seed.json');

    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      throw new AdminError('Katalog dosyası (catalog.seed.json) okunamadı', 500);
    }

    const parsed = legacyCatalogSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AdminError('Katalog dosyasının şeması geçersiz', 422);
    }

    const catalog = legacyToCatalog(parsed.data);
    await replaceCatalog(catalog);

    await writeAudit({
      user,
      action: 'ayar',
      entityType: 'Catalog',
      entityId: 'katalog-sifirla',
      diff: { urun: { before: null, after: catalog.products.length } },
    });

    return Response.json({
      ok: true,
      products: catalog.products.length,
      updatedAt: new Date().toISOString(),
    });
  });
}
