import { handle, readJson } from '@/lib/admin/http';
import { getAdminCustomer, updateCustomerMeta } from '@/server/customers/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_request: Request, { params }: Ctx): Promise<Response> {
  return handle('musteri:oku', async () => {
    const { id } = await params;
    const item = await getAdminCustomer(id);
    if (!item) return Response.json({ error: 'not-found', message: 'Müşteri bulunamadı.' }, { status: 404 });
    return Response.json({ item });
  });
}

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('musteri:yaz', async (user) => {
    const { id } = await params;
    await updateCustomerMeta(id, await readJson(request), user, clientIp(request));
    return Response.json({ item: await getAdminCustomer(id) });
  });
}
