// Çöpteki tek ürün: POST geri yükle, DELETE kalıcı sil.

import { handle } from '@/lib/admin/http';
import { purgeFromTrash, restoreFromTrash } from '@/server/catalog/trash';
import { auditChange } from '@/server/audit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(_req: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;
    const product = await restoreFromTrash(id);
    await auditChange({ user, action: 'olustur', entityType: 'Product', entityId: product.id, before: { copKutusu: true }, after: { slug: product.slug, name: product.name, status: product.status } });
    return Response.json({ product });
  });
}

export function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:sil', async (user) => {
    const { id } = await params;
    const count = await purgeFromTrash([id]);
    await auditChange({ user, action: 'sil', entityType: 'ProductTrash', entityId: id, before: { copKutusu: true }, after: null });
    return Response.json({ ok: true, count });
  });
}
