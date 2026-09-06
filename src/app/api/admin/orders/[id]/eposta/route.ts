import { handle, readJson } from '@/lib/admin/http';
import { resendOrderEmail } from '@/server/orders/edit';
import { getAdminOrder } from '@/server/orders/admin-view';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:yaz', async (user) => {
    const { id } = await params;
    const order = await getAdminOrder(id);
    if (!order) return Response.json({ error: 'not-found', message: 'Sipariş bulunamadı.' }, { status: 404 });
    const { template } = await readJson<{ template: string }>(request);
    await resendOrderEmail(order.id, template, user);
    return Response.json({ ok: true, order: await getAdminOrder(order.id) });
  });
}
