import { handle, readJson } from '@/lib/admin/http';
import { updateShipment } from '@/server/shipping/shipments';
import { getAdminOrder } from '@/server/orders/admin-view';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; shipmentId: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kargo:yaz', async (user) => {
    const { id, shipmentId } = await params;
    await updateShipment(shipmentId, await readJson(request), user, clientIp(request));
    return Response.json({ order: await getAdminOrder(id) });
  });
}
