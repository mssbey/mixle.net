import { handle, readJson } from '@/lib/admin/http';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { createZone, listZonesAdmin } from '@/server/shipping/zones-admin';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('ayar:oku', async () => {
    return Response.json({ zones: await listZonesAdmin() });
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const zone = await createZone(await readJson(request));
    await auditChange({ user, action: 'olustur', entityType: 'ShippingZone', entityId: zone.id, after: { name: zone.name }, ip: clientIp(request) });
    return Response.json({ zone }, { status: 201 });
  });
}
