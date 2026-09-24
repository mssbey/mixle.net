import { handle, readJson } from '@/lib/admin/http';
import { recordManualPayment, setPaymentStatus } from '@/server/orders/payments-admin';
import { getAdminOrder } from '@/server/orders/admin-view';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    await recordManualPayment(order.id, await readJson(request), user, clientIp(request));
    return Response.json({ order: await getAdminOrder(order.id) });
  });
}

/** Hızlı ödeme durumu: { to: 'ödendi' | 'bekliyor' | 'başarısız', note? } */
export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    await setPaymentStatus(order.id, await readJson(request), user, clientIp(request));
    return Response.json({ order: await getAdminOrder(order.id) });
  });
}
