import type { AdminCollection } from '@/types/admin';
import { readJson, withWrite } from '@/lib/admin/http';
import { AdminError, deleteCollection, upsertCollection } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return withWrite(async () => {
    const { id } = await params;
    const patch = await readJson<Partial<AdminCollection>>(request);
    const catalog = await readCatalog();
    const current = catalog.collections.find((c) => c.id === id);
    if (!current) throw new AdminError('Koleksiyon bulunamadı', 404);
    const { catalog: next, collection } = upsertCollection(catalog, { ...current, ...patch, id });
    await writeCatalog(next);
    return Response.json({ collection });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  return withWrite(async () => {
    const { id } = await params;
    const catalog = await readCatalog();
    const next = deleteCollection(catalog, id);
    await writeCatalog(next);
    return Response.json({ ok: true });
  });
}
