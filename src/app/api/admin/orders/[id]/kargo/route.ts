import { handle, readJson } from '@/lib/admin/http';
import { createShipment } from '@/server/shipping/shipments';
import { getAdminOrder } from '@/server/orders/admin-view';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kargo:yaz', async (user) => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    const shipment = await createShipment(order.id, await readJson(request), user, clientIp(request));
    return Response.json({ shipmentId: shipment.id, order: await getAdminOrder(order.id) }, { status: 201 });
  });
}
