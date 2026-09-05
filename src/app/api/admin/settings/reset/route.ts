import { withWrite } from '@/lib/admin/http';
import { resetCatalog } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export function POST(): Promise<Response> {
  return withWrite(async () => {
    const saved = await resetCatalog();
    return Response.json({
      ok: true,
      products: saved.products.length,
      updatedAt: saved.updatedAt,
    });
  });
}
