import type { CatalogFile } from '@/types/admin';
import { canWrite } from '@/lib/admin/guard';
import { readJson, withRead, withWrite } from '@/lib/admin/http';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return withRead(async () => {
    const catalog = await readCatalog();
    return Response.json({ catalog, meta: { canWrite: canWrite() } });
  });
}

export function PUT(request: Request): Promise<Response> {
  return withWrite(async () => {
    const body = await readJson<{ catalog: CatalogFile }>(request);
    const saved = await writeCatalog(body.catalog);
    return Response.json({ catalog: saved, meta: { canWrite: true } });
  });
}
