import { handle, readJson } from '@/lib/admin/http';
import { getAdminReturn, rejectReturn } from '@/server/returns/admin';
import { rejectReturnSchema } from '@/server/returns/schema';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:iade', async (user) => {
    const { id } = await params;
    const body = rejectReturnSchema.parse(await readJson(request));
    await rejectReturn(id, body.note, user, clientIp(request));
    return Response.json({ item: await getAdminReturn(id) });
  });
}
