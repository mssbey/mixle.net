import { handle } from '@/lib/admin/http';
import { getAdminReturn } from '@/server/returns/admin';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function GET(_request: Request, { params }: Ctx): Promise<Response> {
  return handle('siparis:oku', async () => {
    const { id } = await params;
    const row = await getAdminReturn(id);
    if (!row) return Response.json({ error: 'not-found', message: 'İade talebi bulunamadı.' }, { status: 404 });
    return Response.json({ item: row });
  });
}
