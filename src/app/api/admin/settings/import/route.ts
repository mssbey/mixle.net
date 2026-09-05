import type { CatalogFile } from '@/types/admin';
import { readJson, withWrite } from '@/lib/admin/http';
import { AdminError } from '@/lib/admin/mutations';
import { applyCsvPatches, parseCsvPatches } from '@/lib/admin/csv';
import { catalogFileSchema, fieldErrors } from '@/lib/admin/schema';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

interface ImportBody {
  format: 'json' | 'csv';
  data: string;
}

export function POST(request: Request): Promise<Response> {
  return withWrite(async () => {
    const { format, data } = await readJson<ImportBody>(request);
    if (!data || typeof data !== 'string') {
      throw new AdminError('İçe aktarılacak veri boş', 400);
    }

    if (format === 'csv') {
      const patches = parseCsvPatches(data);
      if (patches.length === 0) throw new AdminError('CSV içinde uygulanabilir satır yok', 422);
      const catalog = await readCatalog();
      const { catalog: next, changed, skipped } = applyCsvPatches(catalog, patches);
      const saved = await writeCatalog(next);
      return Response.json({ ok: true, mode: 'csv', changed, skipped, updatedAt: saved.updatedAt });
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
    const saved = await writeCatalog(result.data as CatalogFile);
    return Response.json({
      ok: true,
      mode: 'json',
      products: saved.products.length,
      updatedAt: saved.updatedAt,
    });
  });
}
