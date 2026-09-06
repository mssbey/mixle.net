import type { CatalogFile } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { AdminError } from '@/lib/admin/mutations';
import { applyCsvPatches, parseCsvPatches } from '@/lib/admin/csv';
import { catalogFileSchema, fieldErrors } from '@/lib/admin/schema';
import { readCatalog, replaceCatalog, saveProducts } from '@/server/catalog/persist';
import { writeAudit } from '@/server/audit';

export const dynamic = 'force-dynamic';

interface ImportBody {
  format: 'json' | 'csv';
  data: string;
}

export function POST(request: Request): Promise<Response> {
  return handle('bakim:yaz', async (user) => {
    const { format, data } = await readJson<ImportBody>(request);
    if (!data || typeof data !== 'string') {
      throw new AdminError('İçe aktarılacak veri boş', 400);
    }

    if (format === 'csv') {
      const patches = parseCsvPatches(data);
      if (patches.length === 0) throw new AdminError('CSV içinde uygulanabilir satır yok', 422);

      const catalog = await readCatalog();
      const snapshot = new Map(catalog.products.map((p) => [p.id, JSON.stringify(p)]));
      const { catalog: next, changed, skipped } = applyCsvPatches(catalog, patches);

      // Yalnızca gerçekten değişen ürünler yazılır.
      const touched = next.products.filter((p) => snapshot.get(p.id) !== JSON.stringify(p));
      await saveProducts(touched);

      await writeAudit({
        user,
        action: 'ice-aktar',
        entityType: 'Catalog',
        entityId: 'csv',
        diff: { degisen: { before: 0, after: changed }, atlanan: { before: 0, after: skipped } },
      });

      return Response.json({
        ok: true,
        mode: 'csv',
        changed,
        skipped,
        updatedAt: new Date().toISOString(),
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new AdminError('Geçersiz JSON dosyası', 400);
    }
    const result = catalogFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new AdminError('JSON şeması geçersiz', 422, fieldErrors(result.error));
    }

    const incoming = result.data as CatalogFile;
    await replaceCatalog(incoming);
    await writeAudit({
      user,
      action: 'ice-aktar',
      entityType: 'Catalog',
      entityId: 'json',
      diff: { urun: { before: null, after: incoming.products.length } },
    });

    return Response.json({
      ok: true,
      mode: 'json',
      products: incoming.products.length,
      updatedAt: new Date().toISOString(),
    });
  });
}
