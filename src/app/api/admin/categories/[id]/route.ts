import type { AdminCategory } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { AdminError, deleteCategory, upsertCategory } from '@/lib/admin/mutations';
import { readCatalog, removeCategory, saveCategory } from '@/server/catalog/persist';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;
    const patch = await readJson<Partial<AdminCategory>>(request);
    const catalog = await readCatalog();
    const current = catalog.categories.find((c) => c.id === id);
    if (!current) throw new AdminError('Kategori bulunamadı', 404);

    const { category } = upsertCategory(catalog, { ...current, ...patch, id });
    await saveCategory(category);
    await auditChange({
      user,
      action: 'guncelle',
      entityType: 'Category',
      entityId: category.id,
      before: current as unknown as Record<string, unknown>,
      after: category as unknown as Record<string, unknown>,
    });
    return Response.json({ category });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:sil', async (user) => {
    const { id } = await params;
    const catalog = await readCatalog();
    const current = catalog.categories.find((c) => c.id === id);
    // Saf mutasyon "bu kategoriye bağlı ürün var" gibi kuralları uygular.
    deleteCategory(catalog, id);
    // Altındaki kategoriler silinmez, bir üst seviyeye taşınır (WordPress gibi).
    await removeCategory(id, current?.parentId ?? null);
    await auditChange({
      user,
      action: 'sil',
      entityType: 'Category',
      entityId: id,
      before: current ? { slug: current.slug, name: current.name } : null,
      after: null,
    });
    return Response.json({ ok: true });
  });
}
