// Sipariş listesi (filtreli, sayfalı, CSV) ve manuel sipariş oluşturma.

import { handle, readJson } from '@/lib/admin/http';
import { exportOrdersCsv, listAdminOrders, orderListQuerySchema } from '@/server/orders/admin-view';
import { createOrder } from '@/server/orders/create';
import { writeAudit } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('siparis:oku', async () => {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());
    const query = orderListQuerySchema.parse(raw);

    if (searchParams.get('format') === 'csv') {
      const csv = await exportOrdersCsv(query);
      const stamp = new Date().toISOString().slice(0, 10);
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="siparisler-${stamp}.csv"`,
        },
      });
    }

    return Response.json(await listAdminOrders(query));
  });
}

interface ManualOrderBody {
  order: unknown;
  markPaid?: boolean;
  source?: 'panel' | 'telefon';
  customerId?: string | null;
}

export function POST(request: Request): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const body = await readJson<ManualOrderBody>(request);
    const result = await createOrder(body.order, {
      customerId: body.customerId ?? null,
      ip: clientIp(request),
      userAgent: 'panel',
      idempotencyKey: request.headers.get('idempotency-key'),
      source: body.source === 'telefon' ? 'telefon' : 'panel',
      createdByUserId: user.id,
      markPaid: Boolean(body.markPaid),
    });
    await writeAudit({
      user,
      action: 'olustur',
      entityType: 'Order',
      entityId: result.orderId,
      diff: { orderNumber: { before: null, after: result.orderNumber }, source: { before: null, after: body.source ?? 'panel' } },
      ip: clientIp(request),
    });
    return Response.json(result, { status: result.reused ? 200 : 201 });
  });
}
