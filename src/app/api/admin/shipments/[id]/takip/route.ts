import { handle } from '@/lib/admin/http';
import { syncShipment } from '@/server/shipping/tracking';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(_request: Request, { params }: Ctx): Promise<Response> {
  return handle('kargo:yaz', async () => {
    const { id } = await params;
    return Response.json(await syncShipment(id));
  });
}
