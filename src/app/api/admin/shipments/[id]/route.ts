import { handle, readJson } from '@/lib/admin/http';
import { updateShipment } from '@/server/shipping/shipments';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Sipariş bağlamı olmadan tek sevkiyat güncellemesi — `/admin/kargolar` listesi için. */
export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kargo:yaz', async (user) => {
    const { id } = await params;
    const shipment = await updateShipment(id, await readJson(request), user, clientIp(request));
    return Response.json({ shipment });
  });
}
