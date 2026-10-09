import { handle, readJson } from '@/lib/admin/http';
import { getMegaMenuContent, saveMegaMenuContent } from '@/server/content/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

/** Kayıt yoksa `null` döner; panel varsayılan menüyü kategori ağacından kurar. */
export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => Response.json(await getMegaMenuContent()));
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const before = await getMegaMenuContent();
    const after = await saveMegaMenuContent(await readJson(request), user.id);
    await auditChange({ user, action: 'ayar', entityType: 'Setting', entityId: 'menu-mega', before: before ? { ...before } : null, after: { ...after }, ip: clientIp(request) });
    return Response.json(after);
  });
}
