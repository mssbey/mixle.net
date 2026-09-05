import type { AdminProduct } from '@/types/admin';
import { readJson, withRead, withWrite } from '@/lib/admin/http';
import { AdminError, deleteProduct, updateProduct } from '@/lib/admin/mutations';
import { readCatalog, writeCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx): Promise<Response> {
  return withRead(async () => {
    const { id } = await params;
    const catalog = await readCatalog();
    const product = catalog.products.find((p) => p.id === id || p.slug === id);
    if (!product) throw new AdminError('Ürün bulunamadı', 404);
    return Response.json({ product });
  });
}

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return withWrite(async () => {
    const { id } = await params;
    const patch = await readJson<Partial<AdminProduct>>(request);
    const catalog = await readCatalog();
    const realId = catalog.products.find((p) => p.id === id || p.slug === id)?.id ?? id;
    const { catalog: next, product } = updateProduct(catalog, realId, patch);
    await writeCatalog(next);
    return Response.json({ product });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  return withWrite(async () => {
    const { id } = await params;
    const catalog = await readCatalog();
    const realId = catalog.products.find((p) => p.id === id || p.slug === id)?.id ?? id;
    const next = deleteProduct(catalog, realId);
    await writeCatalog(next);
    return Response.json({ ok: true });
  });
}
