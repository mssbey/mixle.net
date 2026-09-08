import { handle, readJson } from '@/lib/admin/http';
import { listZonesAdmin, reorderZones } from '@/server/shipping/zones-admin';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handle('ayar:yaz', async () => {
    const { orderedIds } = await readJson<{ orderedIds: string[] }>(request);
    await reorderZones(orderedIds);
    return Response.json({ zones: await listZonesAdmin() });
  });
}
