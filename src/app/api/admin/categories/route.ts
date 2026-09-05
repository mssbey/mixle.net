import type { AdminCategory } from '@/types/admin';
import { readJson, withRead, withWrite } from '@/lib/admin/http';
import { upsertCategory } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return withRead(async () => {
    const catalog = await readCatalog();
    return Response.json({ categories: catalog.categories });
  });
}

export function POST(request: Request): Promise<Response> {
  return withWrite(async () => {
    const input = await readJson<AdminCategory>(request);
    const catalog = await readCatalog();
    const { catalog: next, category } = upsertCategory(catalog, input);
    await writeCatalog(next);
    return Response.json({ category }, { status: 201 });
  });
}
