import type { AdminCategory } from '@/types/admin';
import { readJson, withWrite } from '@/lib/admin/http';
import { AdminError, deleteCategory, upsertCategory } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return withWrite(async () => {
    const { id } = await params;
    const patch = await readJson<Partial<AdminCategory>>(request);
    const catalog = await readCatalog();
    const current = catalog.categories.find((c) => c.id === id);
    if (!current) throw new AdminError('Kategori bulunamadı', 404);
    const { catalog: next, category } = upsertCategory(catalog, { ...current, ...patch, id });
    await writeCatalog(next);
    return Response.json({ category });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  return withWrite(async () => {
    const { id } = await params;
    const catalog = await readCatalog();
    const next = deleteCategory(catalog, id);
    await writeCatalog(next);
    return Response.json({ ok: true });
  });
}
