import { handle, readJson } from '@/lib/admin/http';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { deleteZone, updateZone } from '@/server/shipping/zones-admin';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const { id } = await params;
    const zone = await updateZone(id, await readJson(request));
    await auditChange({ user, action: 'guncelle', entityType: 'ShippingZone', entityId: id, after: { name: zone.name }, ip: clientIp(request) });
    return Response.json({ zone });
  });
}

export function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const { id } = await params;
    await deleteZone(id);
    await auditChange({ user, action: 'sil', entityType: 'ShippingZone', entityId: id, ip: clientIp(request) });
    return Response.json({ ok: true });
  });
}
