import { handle, readJson } from '@/lib/admin/http';
import { getHomeBannersContent, saveHomeBannersContent } from '@/server/content/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => Response.json(await getHomeBannersContent()));
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const before = await getHomeBannersContent();
    const after = await saveHomeBannersContent(await readJson(request), user.id);
    await auditChange({ user, action: 'ayar', entityType: 'Setting', entityId: 'sayfa-bannerlar', before, after, ip: clientIp(request) });
    return Response.json(after);
  });
}
