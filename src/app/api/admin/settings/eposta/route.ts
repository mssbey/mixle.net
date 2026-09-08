// E-posta gönderim ayarları — SMTP/Resend. Görüntüleme `ayar:oku`, kayıt `ayar:yaz`.

import { handle, readJson } from '@/lib/admin/http';
import { getEmailSettingsMasked, saveEmailSettings } from '@/server/notifications/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { DEMO_MODE } from '@/server/config';
import { isEncryptionConfigured } from '@/server/crypto/secret-box';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => {
    return Response.json({ settings: await getEmailSettingsMasked(), demoMode: DEMO_MODE, encryptionConfigured: isEncryptionConfigured() });
  });
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const before = await getEmailSettingsMasked();
    await saveEmailSettings(await readJson(request), user.id);
    const after = await getEmailSettingsMasked();
    await auditChange({
      user,
      action: 'ayar',
      entityType: 'Setting',
      entityId: 'eposta',
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      ip: clientIp(request),
    });
    return Response.json({ settings: after, demoMode: DEMO_MODE, encryptionConfigured: isEncryptionConfigured() });
  });
}
