// Next.js 16: `middleware` -> `proxy` olarak yeniden adlandırıldı.
//
// Bu katman KABA bir filtredir: yalnızca çerezdeki oturum jetonunun imzasını ve
// rolün rotaya yetip yetmediğini kontrol eder. Veritabanına erişemez, bu yüzden
// oturumun iptal edilip edilmediğini BURADA bilemez.
//
// ASIL kontrol her Route Handler ve sunucu bileşeninde
// `requireUser()` / `requirePermission()` ile yapılır (bkz.
// src/server/auth/current-user.ts). Yetkiyi asla yalnızca burada veya arayüzde
// gizleyerek uygulama.
//
// KAPSAM DIŞI: `/api/webhooks/**` bilinçli olarak matcher'a dahil DEĞİLDİR —
// ödeme/kargo sağlayıcıları oturum çerezi göndermez; onlar imza doğrulamasıyla
// korunur.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { can, requiredPermissionForPath } from '@/server/auth/rbac';
import { ADMIN_COOKIE, verifySessionToken } from '@/server/auth/session';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

/** Oturum gerektirmeyen uçlar. */
const PUBLIC_PATHS = new Set(['/admin/giris', '/api/admin/auth']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const claims = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);

  if (!claims) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Admin oturumu gerekli.' },
        { status: 401 },
      );
    }
    const loginUrl = new URL('/admin/giris', request.url);
    if (pathname !== '/admin') {
      loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Rota bazlı yetki. İşlem bazlı kontrol Route Handler'larda tekrar yapılır.
  const needed = requiredPermissionForPath(pathname);
  if (!can(claims.role, needed)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: 'forbidden',
          message: `Bu işlem için yetkiniz yok (${needed}). Rolünüz: ${claims.role}.`,
        },
        { status: 403 },
      );
    }
    return NextResponse.rewrite(new URL('/admin/yetkisiz', request.url), { status: 403 });
  }

  return NextResponse.next();
}
