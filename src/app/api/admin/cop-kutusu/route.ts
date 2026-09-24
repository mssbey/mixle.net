// Ürün çöp kutusu: listele / tümünü boşalt.

import { handle } from '@/lib/admin/http';
import { listTrash, purgeFromTrash } from '@/server/catalog/trash';
import { writeAudit } from '@/server/audit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () => Response.json({ items: await listTrash() }));
}

export function DELETE(): Promise<Response> {
  return handle('katalog:sil', async (user) => {
    const count = await purgeFromTrash('all');
    await writeAudit({ user, action: 'sil', entityType: 'ProductTrash', entityId: '*', diff: { copKutusuBosaltildi: { before: count, after: 0 } } });
    return Response.json({ ok: true, count });
  });
}
