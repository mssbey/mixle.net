// Next.js 16: `middleware` -> `proxy` olarak yeniden adlandırıldı.
// /admin ve /api/admin altını basit çerez kontrolüyle korur.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidSession } from '@/lib/admin/auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Giriş sayfası ve giriş API'si her zaman açık.
  if (pathname === '/admin/giris' || pathname === '/api/admin/auth') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (isValidSession(token)) {
    return NextResponse.next();
  }

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
