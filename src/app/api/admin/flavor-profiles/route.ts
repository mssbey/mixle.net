// Tat profili listesi (ürün düzenleyicideki "Profiller" kutusu).
// PUT tüm listeyi değiştirir: ekleme, yeniden adlandırma ve silme tek uçtan.

import { handle, readJson } from '@/lib/admin/http';
import { getFlavorProfilesFresh, saveFlavorProfiles } from '@/server/catalog/flavor-profiles';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () =>
    Response.json({ profiles: await getFlavorProfilesFresh() }),
  );
}

export function PUT(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const before = await getFlavorProfilesFresh();
    const body = await readJson<{ profiles: unknown }>(request);
    const profiles = await saveFlavorProfiles(body.profiles, user.id);
    await auditChange({
      user,
      action: 'guncelle',
      entityType: 'Setting',
      entityId: 'tat-profilleri',
      before: { profiles: before },
      after: { profiles },
      ip: clientIp(request),
    });
    return Response.json({ profiles });
  });
}
