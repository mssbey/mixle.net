import type { AdminProduct } from '@/types/admin';
import { handle, readJson } from '@/lib/admin/http';
import { AdminError, deleteProduct, updateProduct } from '@/lib/admin/mutations';
import { readCatalogSlice, saveProduct } from '@/server/catalog/persist';
import { trashProducts } from '@/server/catalog/trash';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:oku', async () => {
    const { id } = await params;
    const catalog = await readCatalogSlice({ productIds: [id], slugs: [id] });
    const product = catalog.products.find((p) => p.id === id || p.slug === id);
    if (!product) throw new AdminError('Ürün bulunamadı', 404);
    return Response.json({ product });
  });
}

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;
    const patch = await readJson<Partial<AdminProduct>>(request);
    // Mevcut ürün + hedef slug'ı taşıyan olası başka ürün yeter.
    const catalog = await readCatalogSlice({
      productIds: [id],
      slugs: [id, ...(patch?.slug ? [patch.slug] : [])],
    });
    const current = catalog.products.find((p) => p.id === id || p.slug === id);
    if (!current) throw new AdminError('Ürün bulunamadı', 404);

    const { product } = updateProduct(catalog, current.id, patch);
    await saveProduct(product);
    await auditChange({
      user,
      action: 'guncelle',
      entityType: 'Product',
      entityId: product.id,
      before: current as unknown as Record<string, unknown>,
      after: product as unknown as Record<string, unknown>,
      ignore: ['updatedAt'],
    });
    return Response.json({ product });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  // Ürün silme ayrı bir izindir: sipariş-sorumlusu rolü ürün silemez.
  return handle('katalog:sil', async (user) => {
    const { id } = await params;
    const catalog = await readCatalogSlice({ productIds: [id], slugs: [id] });
    const current = catalog.products.find((p) => p.id === id || p.slug === id);
    if (!current) throw new AdminError('Ürün bulunamadı', 404);

    // Saf mutasyon var olmayan kimlikte hata fırlatır — sözleşme korunur.
    deleteProduct(catalog, current.id);
    // Kalıcı silme yok: ürün çöp kutusuna taşınır (30 gün geri yüklenebilir).
    await trashProducts([current], user.email);
    await auditChange({
      user,
      action: 'sil',
      entityType: 'Product',
      entityId: current.id,
      before: { slug: current.slug, name: current.name, status: current.status },
      after: { copKutusu: true },
    });
    return Response.json({ ok: true });
  });
}
