import { readJson, withWrite } from '@/lib/admin/http';
import { reorderCollections } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return withWrite(async () => {
    const { orderedIds } = await readJson<{ orderedIds: string[] }>(request);
    const catalog = await readCatalog();
    const next = reorderCollections(catalog, orderedIds);
    const saved = await writeCatalog(next);
    return Response.json({ collections: saved.collections });
  });
}
