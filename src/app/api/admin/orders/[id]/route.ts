import { handle, readJson } from '@/lib/admin/http';
import { getAdminOrder } from '@/server/orders/admin-view';
import { updateOrderMeta } from '@/server/orders/edit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:oku', async () => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    return Response.json({ order });
  });
}

/** Adresler, admin notu, müşteriye görünen not. */
export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const { id } = await params;
    const body = await readJson(request);
    await updateOrderMeta(id, body, user, clientIp(request));
    return Response.json({ order: await getAdminOrder(id) });
  });
}
