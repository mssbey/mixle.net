import { handle, readJson } from '@/lib/admin/http';
import { updateOrderItems } from '@/server/orders/edit';
import { getAdminOrder } from '@/server/orders/admin-view';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    await updateOrderItems(order.id, await readJson(request), user, clientIp(request));
    return Response.json({ order: await getAdminOrder(order.id) });
  });
}
