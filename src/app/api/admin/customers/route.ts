import { handle } from '@/lib/admin/http';
import { listAdminCustomers, type CustomerListParams } from '@/server/customers/admin';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('musteri:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: CustomerListParams = {
      q: sp.get('q') || undefined,
      tag: sp.get('tag') || undefined,
      sort: (sp.get('sort') as CustomerListParams['sort']) || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listAdminCustomers(params));
  });
}
