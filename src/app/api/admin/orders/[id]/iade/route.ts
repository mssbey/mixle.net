import { handle, readJson } from '@/lib/admin/http';
import { createRefund } from '@/server/orders/refunds';
import { getAdminOrder } from '@/server/orders/admin-view';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:iade', async (user) => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    const refund = await createRefund(order.id, await readJson(request), user, clientIp(request));
    return Response.json({ refundId: refund.id, order: await getAdminOrder(order.id) }, { status: 201 });
  });
}
