// Panel > Stok Yönetimi: tüm ürünler / varyantlar (GET) ve toplu kaydetme (POST).

import { handle, readJson } from '@/lib/admin/http';
import { AdminError } from '@/lib/admin/mutations';
import { managerSaveSchema } from '@/lib/admin/stock-manager';
import { can } from '@/server/auth/rbac';
import { loadManagerData, saveManagerChanges } from '@/server/inventory/manager';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () => Response.json(await loadManagerData()));
}

export function POST(request: Request): Promise<Response> {
  return handle('stok:yaz', async (user) => {
    const body = managerSaveSchema.parse(await readJson<unknown>(request));
    // Stok yetkisi yeterli; fiyat / SKU / KDV / kargo bilgisi katalog yazma ister.
    const touchesCatalog =
      body.products.length > 0 ||
      body.variants.some((v) => v.sku !== undefined || v.priceMinor !== undefined || v.weightGrams !== undefined);
    if (touchesCatalog && !can(user.role, 'katalog:yaz')) {
      throw new AdminError('Fiyat, SKU, KDV ve kargo bilgisini değiştirme yetkiniz yok; yalnız stok değiştirebilirsiniz.', 403);
    }
    return Response.json(await saveManagerChanges(body, user));
  });
}
