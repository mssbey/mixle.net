import { handle, readJson } from '@/lib/admin/http';
import { createAdminUser, listAdminUsers } from '@/server/users/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('kullanici:yonet', async () => Response.json({ items: await listAdminUsers() }));
}

export function POST(request: Request): Promise<Response> {
  return handle('kullanici:yonet', async (user) => {
    const created = await createAdminUser(await readJson(request), user, clientIp(request));
    return Response.json({ user: created }, { status: 201 });
  });
}
