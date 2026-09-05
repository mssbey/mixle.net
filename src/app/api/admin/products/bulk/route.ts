import { readJson, withWrite } from '@/lib/admin/http';
import { bulkProducts, type BulkAction } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return withWrite(async () => {
    const op = await readJson<BulkAction>(request);
    const catalog = await readCatalog();
    const next = bulkProducts(catalog, op);
    const saved = await writeCatalog(next);
    return Response.json({ ok: true, products: saved.products.length });
  });
}
