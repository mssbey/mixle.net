// Durum geçişi — durum makinesi üzerinden; geçersiz geçiş 409.

import { z } from 'zod';
import { handle, readJson } from '@/lib/admin/http';
import { ORDER_STATUSES } from '@/server/orders/state-machine';
import { transitionOrder } from '@/server/orders/transitions';
import { getAdminOrder } from '@/server/orders/admin-view';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  to: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).default(''),
  visibleToCustomer: z.boolean().default(false),
});

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const { id } = await params;
    const input = schema.parse(await readJson(request));
    const before = await getAdminOrder(id);
    if (!before) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });

    // İade geçişleri ayrı izin ister.
    if ((input.to === 'iade-talebi' || input.to === 'iade-edildi') ) {
      const { requirePermission } = await import('@/server/auth/current-user');
      await requirePermission('siparis:iade');
    }

    await transitionOrder(before.id, input.to, { userId: user.id }, {
      note: input.note || undefined,
      visibleToCustomer: input.visibleToCustomer,
    });
    await auditChange({
      user,
      action: 'durum-degistir',
      entityType: 'Order',
      entityId: before.id,
      before: { status: before.status },
      after: { status: input.to, note: input.note },
      ip: clientIp(request),
    });
    return Response.json({ order: await getAdminOrder(before.id) });
  });
}
