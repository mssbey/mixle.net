// Ödeme ayarları — yalnız `ayar:odeme` (sahip). Gizli alanlar maskeli döner.

import { handle, readJson } from '@/lib/admin/http';
import { getPaymentSettingsMasked, savePaymentSettings } from '@/server/payments/settings';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { DEMO_MODE } from '@/server/config';
import { isEncryptionConfigured } from '@/server/crypto/secret-box';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('ayar:odeme', async () => {
    return Response.json({ settings: await getPaymentSettingsMasked(), demoMode: DEMO_MODE, encryptionConfigured: isEncryptionConfigured() });
  });
}

export function PUT(request: Request): Promise<Response> {
  return handle('ayar:odeme', async (user) => {
    const before = await getPaymentSettingsMasked();
    await savePaymentSettings(await readJson(request), user.id);
    const after = await getPaymentSettingsMasked();
    await auditChange({
      user,
      action: 'ayar',
      entityType: 'Setting',
      entityId: 'odeme',
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      ip: clientIp(request),
    });
    return Response.json({ settings: after, demoMode: DEMO_MODE, encryptionConfigured: isEncryptionConfigured() });
  });
}
