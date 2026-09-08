import { handle, readJson } from '@/lib/admin/http';
import { auditChange } from '@/server/audit';
import { clientIp } from '@/server/auth/rate-limit';
import { createMethod } from '@/server/shipping/zones-admin';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('ayar:yaz', async (user) => {
    const { id } = await params;
    const method = await createMethod(id, await readJson(request));
    await auditChange({ user, action: 'olustur', entityType: 'ShippingMethod', entityId: method.id, after: { name: method.name, zoneId: id }, ip: clientIp(request) });
    return Response.json({ method }, { status: 201 });
  });
}
