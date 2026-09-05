import type { AdminCollection } from '@/types/admin';
import { readJson, withRead, withWrite } from '@/lib/admin/http';
import { upsertCollection } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return withRead(async () => {
    const catalog = await readCatalog();
    return Response.json({ collections: catalog.collections });
  });
}

export function POST(request: Request): Promise<Response> {
  return withWrite(async () => {
    const input = await readJson<AdminCollection>(request);
    const catalog = await readCatalog();
    const { catalog: next, collection } = upsertCollection(catalog, input);
    await writeCatalog(next);
    return Response.json({ collection }, { status: 201 });
  });
}
