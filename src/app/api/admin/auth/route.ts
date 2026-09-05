import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  sessionToken,
  verifyPassword,
} from '@/lib/admin/auth';
import { readJson } from '@/lib/admin/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const { password } = await readJson<{ password: string }>(request).catch(() => ({ password: '' }));
  if (!password || !verifyPassword(password)) {
    return Response.json(
      { error: 'invalid', message: 'Parola hatalı.' },
      { status: 401 },
    );
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  return Response.json({ ok: true });
}

export async function DELETE(): Promise<Response> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
