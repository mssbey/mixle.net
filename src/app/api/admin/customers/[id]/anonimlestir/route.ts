import { handle } from '@/lib/admin/http';
import { anonymizeCustomer } from '@/server/customers/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('musteri:yaz', async (user) => {
    const { id } = await params;
    await anonymizeCustomer(id, user, clientIp(request));
    return Response.json({ ok: true });
  });
}
