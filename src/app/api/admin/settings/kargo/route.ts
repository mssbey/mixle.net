// Kargo ayarları — taşıyıcı bağlantıları (maskeli) + kapıda ödeme kısıtları.
// Görüntüleme `ayar:oku`, kayıt `ayar:yaz` gerektirir (ödeme anahtarlarının
// aksine sahibe özel değildir).

import { handle, readJson } from '@/lib/admin/http';
import { getShippingSettingsMasked, saveShippingSettings, getCodLimits, saveCodLimits } from '@/server/shipping/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { isEncryptionConfigured } from '@/server/crypto/secret-box';

export const dynamic = 'force-dynamic';

async function payload() {
  const [providers, cod] = await Promise.all([getShippingSettingsMasked(), getCodLimits()]);
  return { providers: providers.providers, cod, encryptionConfigured: isEncryptionConfigured() };
}

export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => Response.json(await payload()));
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const before = await payload();
    const body = await readJson<{ providers: unknown; cod: unknown }>(request);
    await Promise.all([saveShippingSettings({ providers: body.providers }, user.id), saveCodLimits(body.cod, user.id)]);
    const after = await payload();
    await auditChange({
      user,
      action: 'ayar',
      entityType: 'Setting',
      entityId: 'kargo',
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      ip: clientIp(request),
    });
    return Response.json(after);
  });
}
