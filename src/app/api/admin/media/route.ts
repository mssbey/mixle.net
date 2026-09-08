import { handle } from '@/lib/admin/http';
import { listMediaAssets, uploadMediaAsset, type MediaListParams } from '@/server/media/admin';
import { AdminError } from '@/lib/admin/mutations';
import { clientIp } from '@/server/auth/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const sp = new URL(request.url).searchParams;
    const params: MediaListParams = {
      q: sp.get('q') || undefined,
      tag: sp.get('tag') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : undefined,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    };
    return Response.json(await listMediaAssets(params));
  });
}

export function POST(request: Request): Promise<Response> {
  return handle('katalog:yaz', async (user) => {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) throw new AdminError('Dosya bulunamadı ("file" alanı).', 400);
    const asset = await uploadMediaAsset(file, user, clientIp(request));
    return Response.json({ asset }, { status: 201 });
  });
}
