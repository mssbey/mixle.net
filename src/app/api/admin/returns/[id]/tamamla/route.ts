import { handle, readJson } from '@/lib/admin/http';
import { completeReturn, getAdminReturn } from '@/server/returns/admin';
import { completeReturnSchema } from '@/server/returns/schema';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:iade', async (user) => {
    const { id } = await params;
    const body = completeReturnSchema.parse(await readJson(request));
    await completeReturn(id, body, user, clientIp(request));
    return Response.json({ item: await getAdminReturn(id) });
  });
}
