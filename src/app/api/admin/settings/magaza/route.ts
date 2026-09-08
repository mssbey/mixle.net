// Mağaza bilgisi ve genel ayarlar (KDV, cayma hakkı, rezervasyon süresi, düşük
// stok eşiği). Hassas veri içermez — panelde kayıt yoksa varsayılan değerler.

import { handle, readJson } from '@/lib/admin/http';
import { getStoreInfo, getStoreSettings, storeInfoSchema, storeSettingsSchema, writeSetting, SETTING_KEYS } from '@/server/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

async function payload() {
  const [info, settings] = await Promise.all([getStoreInfo(), getStoreSettings()]);
  return { info, settings };
}

export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => Response.json(await payload()));
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const before = await payload();
    const body = await readJson<{ info: unknown; settings: unknown }>(request);
    const info = storeInfoSchema.parse(body.info);
    const settings = storeSettingsSchema.parse(body.settings);
    await Promise.all([
      writeSetting(SETTING_KEYS.info, info, user.id),
      writeSetting(SETTING_KEYS.store, settings, user.id),
    ]);
    const after = await payload();
    await auditChange({ user, action: 'ayar', entityType: 'Setting', entityId: 'magaza', before, after, ip: clientIp(request) });
    return Response.json(after);
  });
}
