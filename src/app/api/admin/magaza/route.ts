// Panelde seçili mağaza. Seçim bir çerezde tutulur; `handle()` her admin
// isteğini bu mağazanın bağlamında çalıştırır (bkz. server/store-context.ts).

import { cookies } from 'next/headers';
import { z } from 'zod';
import { handle, readJson } from '@/lib/admin/http';
import { ADMIN_STORE_COOKIE, STORE_META, STORES } from '@/lib/stores';
import { readAdminStore } from '@/server/store-context';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ store: z.enum(STORES) });

export function GET(): Promise<Response> {
  return handle('katalog:oku', async () =>
    Response.json({ store: await readAdminStore(), stores: STORES.map((id) => STORE_META[id]) }),
  );
}

export function POST(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const { store } = bodySchema.parse(await readJson<unknown>(request));
    const jar = await cookies();
    jar.set(ADMIN_STORE_COOKIE, store, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return Response.json({ store });
  });
}
