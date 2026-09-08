import { handle, readJson } from '@/lib/admin/http';
import { createCoupon, listAdminCoupons, type CouponListParams } from '@/server/coupons/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: CouponListParams = {
      q: sp.get('q') || undefined,
      active: (sp.get('active') as CouponListParams['active']) || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listAdminCoupons(params));
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('kupon:yaz', async (user) => {
    const coupon = await createCoupon(await readJson(request), user, clientIp(request));
    return Response.json({ coupon }, { status: 201 });
  });
}
