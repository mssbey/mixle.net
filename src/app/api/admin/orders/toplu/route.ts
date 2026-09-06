// Toplu işlemler: durum değiştir, kargoya ver (manuel), e-posta yeniden gönder.
// Her sipariş ayrı işlenir; biri hata verirse diğerleri devam eder ve sonuç
// listesi döner (kısmi başarı arayüzde gösterilir).

import { z } from 'zod';
import { handle, readJson } from '@/lib/admin/http';
import { ORDER_STATUSES } from '@/server/orders/state-machine';
import { transitionOrder } from '@/server/orders/transitions';
import { createShipment, CARRIERS } from '@/server/shipping/shipments';
import { resendOrderEmail } from '@/server/orders/edit';
import { db } from '@/server/db';
import { writeAudit } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('durum'), ids: z.array(z.string()).min(1).max(200), to: z.enum(ORDER_STATUSES), note: z.string().max(300).default('') }),
  z.object({ action: z.literal('kargo'), ids: z.array(z.string()).min(1).max(200), carrier: z.enum(CARRIERS) }),
  z.object({ action: z.literal('eposta'), ids: z.array(z.string()).min(1).max(200), template: z.string() }),
]);

export function POST(request: Request): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const input = schema.parse(await readJson(request));
    const ip = clientIp(request);
    const results: { id: string; ok: boolean; message?: string }[] = [];

    for (const id of input.ids) {
      try {
        if (input.action === 'durum') {
          await transitionOrder(id, input.to, { userId: user.id }, { note: input.note || 'Toplu işlem' });
        } else if (input.action === 'kargo') {
          await createShipment(id, { carrier: input.carrier, markShipped: true }, user, ip);
        } else {
          await resendOrderEmail(id, input.template, user);
        }
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, message: err instanceof Error ? err.message : 'Hata' });
      }
    }

    const numbers = await db.order.findMany({ where: { id: { in: input.ids } }, select: { id: true, orderNumber: true } });
    const byId = new Map(numbers.map((n) => [n.id, n.orderNumber]));

    await writeAudit({
      user,
      action: input.action === 'durum' ? 'durum-degistir' : 'guncelle',
      entityType: 'Order',
      entityId: input.ids.join(','),
      diff: { toplu: { before: null, after: { action: input.action, ok: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length } } },
      ip,
    });

    return Response.json({
      results: results.map((r) => ({ ...r, orderNumber: byId.get(r.id) ?? r.id })),
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  });
}
