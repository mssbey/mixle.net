import { handle, readJson } from '@/lib/admin/http';
import { reorderCollections } from '@/lib/admin/mutations';
import { readCatalog, saveCollectionOrder } from '@/server/catalog/persist';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async () => {
    const { orderedIds } = await readJson<{ orderedIds: string[] }>(request);
    const catalog = await readCatalog();
    const next = reorderCollections(catalog, orderedIds);
    await saveCollectionOrder(next.collections);
    return Response.json({ collections: next.collections });
  });
}
