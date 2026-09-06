import { handle, readJson } from '@/lib/admin/http';
import { bulkProducts, type BulkAction } from '@/lib/admin/mutations';
import { readCatalog, removeProduct, saveProducts } from '@/server/catalog/persist';
import { writeAudit } from '@/server/audit';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const op = await readJson<BulkAction>(request);
    const catalog = await readCatalog();
    const next = bulkProducts(catalog, op);

    if (op.action === 'delete') {
      // Toplu silme ayrı izin ister.
      const { requirePermission } = await import('@/server/auth/current-user');
      await requirePermission('katalog:sil');

      const remaining = new Set(next.products.map((p) => p.id));
      const removed = catalog.products.filter((p) => !remaining.has(p.id));
      for (const p of removed) await removeProduct(p.id);
      await writeAudit({
        user,
        action: 'sil',
        entityType: 'Product',
        entityId: removed.map((p) => p.id).join(','),
        diff: { toplu: { before: removed.length, after: 0 } },
      });
    } else {
      // Yalnızca gerçekten değişen ürünleri yaz.
      const before = new Map(catalog.products.map((p) => [p.id, JSON.stringify(p)]));
      const changed = next.products.filter((p) => before.get(p.id) !== JSON.stringify(p));
      await saveProducts(changed);
      await writeAudit({
        user,
        action: 'guncelle',
        entityType: 'Product',
        entityId: changed.map((p) => p.id).join(','),
        diff: { topluIslem: { before: op.action, after: changed.length } },
      });
    }

    return Response.json({ ok: true, products: next.products.length });
  });
}
