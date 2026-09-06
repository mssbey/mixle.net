// Admin giriş / çıkış / oturum bilgisi.
//
// Bu uç `src/proxy.ts` içinde PUBLIC_PATHS listesindedir (giriş yapabilmek için
// oturum gerekemez), bu yüzden korumasını kendisi yapar: oran sınırı, sabit
// süreli hata yanıtı ve denetim kaydı.

import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '@/server/db';
import { writeAudit } from '@/server/audit';
import { verifyPassword } from '@/server/auth/password';
import { checkLock, clientIp, recordAttempt } from '@/server/auth/rate-limit';
import type { Role } from '@/server/auth/rbac';
import { rolePermissions } from '@/server/auth/rbac';
import {
  ADMIN_COOKIE,
  REMEMBER_SECONDS,
  SESSION_SECONDS,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from '@/server/auth/session';
import { getCurrentUser } from '@/server/auth/current-user';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'E-posta zorunlu').max(200),
  password: z.string().min(1, 'Parola zorunlu').max(200),
  remember: z.boolean().optional(),
});

/**
 * Kullanıcı bulunamadığında da parola doğrulaması kadar zaman harcanır ki
 * yanıt süresinden e-postanın kayıtlı olup olmadığı anlaşılmasın.
 */
const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid', message: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid', message: 'E-posta ve parola gerekli.' },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLocaleLowerCase('tr');
  const lock = await checkLock(email, ip);
  if (lock.locked) {
    return Response.json(
      {
        error: 'locked',
        message: `Çok fazla hatalı deneme. ${lock.minutesLeft} dakika sonra tekrar deneyin.`,
      },
      { status: 429 },
    );
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok || !user.isActive) {
    await recordAttempt(email, ip, false);
    const left = Math.max(0, lock.remainingAttempts - 1);
    return Response.json(
      {
        error: 'invalid',
        // Hesabın var olup olmadığını sızdırmayan tek tip mesaj.
        message:
          left > 0
            ? `E-posta veya parola hatalı. ${left} deneme hakkınız kaldı.`
            : 'E-posta veya parola hatalı.',
      },
      { status: 401 },
    );
  }

  await recordAttempt(email, ip, true);

  const maxAge = parsed.data.remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const session = await db.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + maxAge * 1000),
      rememberMe: Boolean(parsed.data.remember),
      ip,
      userAgent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
    },
  });

  const token = await createSessionToken(
    { sid: session.id, uid: user.id, role: user.role as Role, email: user.email },
    maxAge,
  );

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, sessionCookieOptions(maxAge));

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({
    user: { id: user.id, email: user.email },
    action: 'giris',
    entityType: 'User',
    entityId: user.id,
    ip,
  });

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: rolePermissions[user.role as Role],
    },
  });
}

/** Çıkış — oturumu veritabanında da iptal eder (jeton süresi dolmasa bile geçersiz olur). */
export async function DELETE(request: Request): Promise<Response> {
  const jar = await cookies();
  const claims = await verifySessionToken(jar.get(ADMIN_COOKIE)?.value);

  if (claims) {
    await db.session
      .update({ where: { id: claims.sid }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
    await writeAudit({
      user: { id: claims.uid, email: claims.email },
      action: 'cikis',
      entityType: 'User',
      entityId: claims.uid,
      ip: clientIp(request),
    });
  }

  jar.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}

/** Geçerli oturum bilgisi — panel açılışında kullanıcı/rol/izinleri okur. */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'unauthorized', message: 'Oturum yok.' }, { status: 401 });
  }
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: rolePermissions[user.role],
    },
  });
}
