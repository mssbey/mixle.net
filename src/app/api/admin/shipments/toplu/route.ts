import { z } from 'zod';
import { handle, readJson } from '@/lib/admin/http';
import { syncShipment } from '@/server/shipping/tracking';

export const dynamic = 'force-dynamic';

const bulkSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });

export function POST(request: Request): Promise<Response> {
  return handle('kargo:yaz', async () => {
    const { ids } = bulkSchema.parse(await readJson(request));
    const results = [];
    for (const id of ids) results.push(await syncShipment(id));
    const updated = results.filter((r) => r.updated).length;
    return Response.json({ results, updated, total: results.length });
  });
}
