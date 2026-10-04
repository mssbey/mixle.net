// Vitrin önizleme: Draft Mode çerezini açar/kapatır ve yönlendirir.
//
//   GET /api/admin/preview?slug=<slug>        → çerezi aç, /urun/<slug>'a git
//   GET /api/admin/preview?cikis=1&geri=<yol>  → çerezi kapat, <yol>'a dön
//
// Yalnızca oturumlu ve `katalog:oku` izni olan kullanıcı çağırabilir; çerez
// tarayıcı kapanana kadar yaşar ve vitrinin her önbellek katmanını atlar.

import { draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { handle } from '@/lib/admin/http';
import { editorPath, safeInternalPath, storefrontPath } from '@/lib/admin/preview';
import { getAdminProductBySlugFresh } from '@/server/catalog/queries';
import { currentStore, deploymentStore } from '@/server/store-context';
import { getStoreBrand } from '@/server/settings';
import { signPreviewQuery } from '@/server/storefront-sync';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handle('katalog:oku', async () => {
    const url = new URL(request.url);
    const draft = await draftMode();

    if (url.searchParams.get('cikis') === '1') {
      draft.disable();
      const back = safeInternalPath(url.searchParams.get('geri'), '/admin/urunler');
      return NextResponse.redirect(new URL(back, url.origin), { status: 303 });
    }

    const slug = (url.searchParams.get('slug') ?? '').trim();
    const product = slug ? await getAdminProductBySlugFresh(slug) : undefined;
    if (!product) {
      return NextResponse.json(
        { error: 'not-found', message: `"${slug}" için ürün bulunamadı.`, editor: editorPath(slug) },
        { status: 404 },
      );
    }

    // Başka mağazanın ürünü: kendi alan adındaki vitrinde, imzalı bağlantıyla açılır.
    if (currentStore() !== deploymentStore()) {
      const { url: siteUrl } = await getStoreBrand();
      const query = signPreviewQuery(product.slug);
      if (!siteUrl || !query) {
        return NextResponse.json(
          {
            error: 'config',
            message: !siteUrl
              ? 'Önizleme için Ayarlar → Mağaza → "Vitrin adresi" girilmeli.'
              : 'Önizleme için REVALIDATE_SECRET tanımlı olmalı (iki dağıtımda aynı değer).',
          },
          { status: 409 },
        );
      }
      return NextResponse.redirect(`${siteUrl}/api/onizleme?${query}`, { status: 303 });
    }

    draft.enable();
    return NextResponse.redirect(new URL(storefrontPath(product.slug), url.origin), { status: 303 });
  });
}
