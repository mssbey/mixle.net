import { handle, readJson } from '@/lib/admin/http';
import {
  createDiscountRule,
  listAdminDiscountRules,
  type DiscountRuleListParams,
} from '@/server/discounts/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: DiscountRuleListParams = {
      q: sp.get('q') || undefined,
      type: (sp.get('type') as DiscountRuleListParams['type']) || undefined,
      active: (sp.get('active') as DiscountRuleListParams['active']) || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listAdminDiscountRules(params));
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('kupon:yaz', async (user) => {
    const rule = await createDiscountRule(await readJson(request), user, clientIp(request));
    return Response.json({ rule }, { status: 201 });
  });
}
