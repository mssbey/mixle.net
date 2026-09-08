import { handle } from '@/lib/admin/http';
import { listAdminReturns, type ReturnListParams } from '@/server/returns/admin';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('siparis:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: ReturnListParams = {
      status: (sp.get('status') as ReturnListParams['status']) || undefined,
      q: sp.get('q') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listAdminReturns(params));
  });
}
