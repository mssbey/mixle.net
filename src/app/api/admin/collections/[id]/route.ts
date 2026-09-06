import type { AdminCollection } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { AdminError, deleteCollection, upsertCollection } from '@/lib/admin/mutations';
import { readCatalog, removeCollection, saveCollection } from '@/server/catalog/persist';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;
    const patch = await readJson<Partial<AdminCollection>>(request);
    const catalog = await readCatalog();
    const current = catalog.collections.find((c) => c.id === id);
    if (!current) throw new AdminError('Koleksiyon bulunamadı', 404);

    const { collection } = upsertCollection(catalog, { ...current, ...patch, id });
    await saveCollection(collection);
    await auditChange({
      user,
      action: 'guncelle',
      entityType: 'Collection',
      entityId: collection.id,
      before: current as unknown as Record<string, unknown>,
      after: collection as unknown as Record<string, unknown>,
    });
    return Response.json({ collection });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:sil', async (user) => {
    const { id } = await params;
    const catalog = await readCatalog();
    const current = catalog.collections.find((c) => c.id === id);
    deleteCollection(catalog, id);
    await removeCollection(id);
    await auditChange({
      user,
      action: 'sil',
      entityType: 'Collection',
      entityId: id,
      before: current ? { slug: current.slug, name: current.name } : null,
      after: null,
    });
    return Response.json({ ok: true });
  });
}
