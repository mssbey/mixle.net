import { handle } from '@/lib/admin/http';
import { listAdminShipments, type ShipmentListParams } from '@/server/shipping/admin-view';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('siparis:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: ShipmentListParams = {
      tab: (sp.get('tab') as ShipmentListParams['tab']) || undefined,
      status: sp.get('status') || undefined,
      carrier: sp.get('carrier') || undefined,
      q: sp.get('q') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listAdminShipments(params));
  });
}
