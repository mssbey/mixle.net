import { readJson, withWrite } from '@/lib/admin/http';
import { reorderCategories } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return withWrite(async () => {
    const { orderedIds } = await readJson<{ orderedIds: string[] }>(request);
    const catalog = await readCatalog();
    const next = reorderCategories(catalog, orderedIds);
    const saved = await writeCatalog(next);
    return Response.json({ categories: saved.categories });
  });
}
