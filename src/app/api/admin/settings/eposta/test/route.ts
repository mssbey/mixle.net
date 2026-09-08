// Test e-postası gönder — ayarları kaydetmeden önce doğrulamak için.
// DEMO_MODE'da da çalışır (gerçek gönderim denenir; sipariş akışından bağımsız).

import { z } from 'zod';
import { handle, readJson } from '@/lib/admin/http';
import { sendMailNow } from '@/server/notifications/mailer';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ to: z.string().trim().email('Geçerli bir e-posta girin') });

export function POST(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const { to } = bodySchema.parse(await readJson(request));
    const result = await sendMailNow(
      to,
      'Nefis Aroma — Test e-postası',
      `Merhaba,\n\nBu, ${user.name || user.email} tarafından panel ayarlarından gönderilen bir test e-postasıdır. Bu e-postayı görüyorsanız gönderim ayarları çalışıyor.\n\nNefis Aroma`,
    );
    if (!result.ok) {
      return Response.json({ ok: false, message: result.error ?? 'Gönderim başarısız' }, { status: 422 });
    }
    return Response.json({ ok: true });
  });
}
