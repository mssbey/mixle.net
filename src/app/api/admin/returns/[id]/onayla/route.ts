import { handle, readJson } from '@/lib/admin/http';
import { approveReturn, getAdminReturn } from '@/server/returns/admin';
import { approveReturnSchema } from '@/server/returns/schema';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:iade', async (user) => {
    const { id } = await params;
    const body = approveReturnSchema.parse(await readJson(request));
    await approveReturn(id, body.note, body.returnCode || undefined, user, clientIp(request));
    return Response.json({ item: await getAdminReturn(id) });
  });
}
