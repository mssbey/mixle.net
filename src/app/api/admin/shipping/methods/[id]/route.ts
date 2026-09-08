import { handle, readJson } from '@/lib/admin/http';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { deleteMethod, updateMethod } from '@/server/shipping/zones-admin';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const { id } = await params;
    const method = await updateMethod(id, await readJson(request));
    await auditChange({ user, action: 'guncelle', entityType: 'ShippingMethod', entityId: id, after: { name: method.name, isActive: method.isActive }, ip: clientIp(request) });
    return Response.json({ method });
  });
}

export function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const { id } = await params;
    await deleteMethod(id);
    await auditChange({ user, action: 'sil', entityType: 'ShippingMethod', entityId: id, ip: clientIp(request) });
    return Response.json({ ok: true });
  });
}
