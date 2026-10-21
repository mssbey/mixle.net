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
    const body = await readJson<Record<string, unknown>>(request);
    const result = await updateOrderItems(order.id, body, user, clientIp(request));
    // Önizleme: hiçbir şey yazılmadı, yalnız hesap döner.
    if (body?.dryRun === true) {
      return Response.json({
        preview: {
          lines: result.totals.lines.map((l) => ({ variantId: l.variantId, discountMinor: l.discountMinor, couponDiscountMinor: l.couponDiscountMinor, netLineMinor: l.netLineMinor })),
          autoDiscountMinor: result.totals.autoDiscountMinor,
          grandTotalMinor: result.totals.grandTotalMinor,
          appliedDiscounts: result.appliedDiscounts,
        },
      });
    }
    return Response.json({ order: await getAdminOrder(order.id) });
  });
}
