import { handle, readJson } from '@/lib/admin/http';
import { updateAdminUser } from '@/server/users/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kullanici:yonet', async (user) => {
    const { id } = await params;
    const updated = await updateAdminUser(id, await readJson(request), user, clientIp(request));
    return Response.json({ user: updated });
  });
}
