// Stok Yönetimi CSV içe aktarımı. Önce `dryRun: true` ile özet alınır
// (bulunan / güncellenecek / değişiklik yok / hata), sonra uygulanır.

import { z } from 'zod';
import { handle, readJson } from '@/lib/admin/http';
import { AdminError } from '@/lib/admin/mutations';
import { csvRowSchema } from '@/lib/admin/stock-manager';
import { can } from '@/server/auth/rbac';
import { csvToChanges, saveManagerChanges } from '@/server/inventory/manager';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  dryRun: z.boolean().default(true),
  rows: z.array(csvRowSchema).min(1, 'Dosyada satır yok').max(5000, 'En fazla 5000 satır'),
});

export function POST(request: Request): Promise<Response> {
  return handle('stok:yaz', async (user) => {
    const { dryRun, rows } = bodySchema.parse(await readJson<unknown>(request));
    const { changes, errors } = await csvToChanges(rows);
    const touchesCatalog = changes.some((c) => c.priceMinor !== undefined || c.weightGrams !== undefined);
    if (touchesCatalog && !can(user.role, 'katalog:yaz')) {
      throw new AdminError('Dosyada fiyat / ağırlık var; bunları değiştirme yetkiniz yok. Yalnız stok sütunlarını bırakın.', 403);
    }
    return Response.json(await saveManagerChanges({ source: 'csv', dryRun, variants: changes }, user, errors));
  });
}
