import { handle } from '@/lib/admin/http';
import { getAdminReturn, markGoodsReceived } from '@/server/returns/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:iade', async (user) => {
    const { id } = await params;
    await markGoodsReceived(id, user, clientIp(request));
    return Response.json({ item: await getAdminReturn(id) });
  });
}
