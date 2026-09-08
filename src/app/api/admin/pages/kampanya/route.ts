import { handle, readJson } from '@/lib/admin/http';
import { getCampaignContent, saveCampaignContent } from '@/server/content/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => Response.json(await getCampaignContent()));
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const before = await getCampaignContent();
    const after = await saveCampaignContent(await readJson(request), user.id);
    await auditChange({ user, action: 'ayar', entityType: 'Setting', entityId: 'sayfa-kampanya', before, after, ip: clientIp(request) });
    return Response.json(after);
  });
}
