import { handle, readJson } from '@/lib/admin/http';
import { deleteCoupon, updateCoupon } from '@/server/coupons/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kupon:yaz', async (user) => {
    const { id } = await params;
    const coupon = await updateCoupon(id, await readJson(request), user, clientIp(request));
    return Response.json({ coupon });
  });
}

export function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kupon:yaz', async (user) => {
    const { id } = await params;
    await deleteCoupon(id, user, clientIp(request));
    return Response.json({ ok: true });
  });
}
