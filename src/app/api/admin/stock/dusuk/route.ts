import { handle } from '@/lib/admin/http';
import { lowStockReport } from '@/server/inventory/admin';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () => Response.json(await lowStockReport()));
}
