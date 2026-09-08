import { handle } from '@/lib/admin/http';
import { listStockMovements, type StockMovementListParams } from '@/server/inventory/admin';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: StockMovementListParams = {
      q: sp.get('q') || undefined,
      reason: sp.get('reason') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listStockMovements(params));
  });
}
