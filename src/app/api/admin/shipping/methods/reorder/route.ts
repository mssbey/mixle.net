import { handle, readJson } from '@/lib/admin/http';
import { listZonesAdmin, reorderMethods } from '@/server/shipping/zones-admin';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Promise<Response> {
  return handle('ayar:yaz', async () => {
    const { zoneId, orderedIds } = await readJson<{ zoneId: string; orderedIds: string[] }>(request);
    await reorderMethods(zoneId, orderedIds);
    return Response.json({ zones: await listZonesAdmin() });
  });
}
