import type { AdminCollection } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { upsertCollection } from '@/lib/admin/mutations';
import { readCatalog, saveCollection } from '@/server/catalog/persist';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () => {
    const catalog = await readCatalog();
    return Response.json({ collections: catalog.collections });
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const input = await readJson<AdminCollection>(request);
    const catalog = await readCatalog();
    const { collection } = upsertCollection(catalog, input);
    await saveCollection(collection);
    await auditChange({
      user,
      action: 'olustur',
      entityType: 'Collection',
      entityId: collection.id,
      after: { slug: collection.slug, name: collection.name },
    });
    return Response.json({ collection }, { status: 201 });
  });
}
