import { handle } from '@/lib/admin/http';
import { AdminError } from '@/lib/admin/mutations';
import { variantHistory } from '@/server/inventory/manager';

export const dynamic = 'force-dynamic';

export function GET(_request: Request, ctx: { params: Promise<{ variantId: string }> }): Promise<Response> {
  return handle('katalog:oku', async () => {
    const { variantId } = await ctx.params;
    const history = await variantHistory(variantId);
    if (!history.variant) throw new AdminError('Varyant bulunamadı', 404);
    return Response.json(history);
  });
}
