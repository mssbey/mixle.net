import { handle, readJson } from '@/lib/admin/http';
import { reorderCategories } from '@/lib/admin/mutations';
import { readCatalog, saveCategoryOrder } from '@/server/catalog/persist';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async () => {
    const { orderedIds } = await readJson<{ orderedIds: string[] }>(request);
    const catalog = await readCatalog();
    const next = reorderCategories(catalog, orderedIds);
    await saveCategoryOrder(next.categories);
    return Response.json({ categories: next.categories });
  });
}
