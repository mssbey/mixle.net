import type { AdminCategory } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { upsertCategory } from '@/lib/admin/mutations';
import { readCatalog, saveCategory } from '@/server/catalog/persist';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () => {
    const catalog = await readCatalog();
    return Response.json({ categories: catalog.categories });
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const input = await readJson<AdminCategory>(request);
    const catalog = await readCatalog();
    const { category } = upsertCategory(catalog, input);
    await saveCategory(category);
    await auditChange({
      user,
      action: 'olustur',
      entityType: 'Category',
      entityId: category.id,
      after: { slug: category.slug, name: category.name },
    });
    return Response.json({ category }, { status: 201 });
  });
}
