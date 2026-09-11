import { handle, readJson } from '@/lib/admin/http';
import { deleteDiscountRule, updateDiscountRule } from '@/server/discounts/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kupon:yaz', async (user) => {
    const { id } = await params;
    const rule = await updateDiscountRule(id, await readJson(request), user, clientIp(request));
    return Response.json({ rule });
  });
}

export function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  return handle('kupon:yaz', async (user) => {
    const { id } = await params;
    await deleteDiscountRule(id, user, clientIp(request));
    return Response.json({ ok: true });
  });
}
