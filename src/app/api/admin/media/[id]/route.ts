import { handle, readJson } from '@/lib/admin/http';
import { deleteMediaAsset, updateMediaAsset } from '@/server/media/admin';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;
    const asset = await updateMediaAsset(id, await readJson(request), user, clientIp(request));
    return Response.json({ asset });
  });
}

export function DELETE(request: Request, { params }: Ctx): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const { id } = await params;
    await deleteMediaAsset(id, user, clientIp(request));
    return Response.json({ ok: true });
  });
}
