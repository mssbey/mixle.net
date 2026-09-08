import { handle, readJson } from '@/lib/admin/http';
import { manualAdjust } from '@/server/inventory/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ variantId: string }> };

export function POST(request: Request, { params }: Ctx): Promise<Response> {
  return handle('stok:yaz', async (user) => {
    const { variantId } = await params;
    const movement = await manualAdjust(variantId, await readJson(request), user, clientIp(request));
    return Response.json({ movement }, { status: 201 });
  });
}
