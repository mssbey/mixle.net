// Basit çerez tabanlı admin girişi. GERÇEK KİMLİK DOĞRULAMA DEĞİLDİR:
// tek paylaşılan parola, tek kullanıcı, rol yok. Demo/vitrin koruması amaçlıdır.

import crypto from 'node:crypto';

export const ADMIN_COOKIE = 'na_admin';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 gün

const DEFAULT_PASSWORD = 'nefis-admin';
const SIGNING_SALT = 'nefis-aroma-admin-v1';

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

/** Parolanın kullanılıp kullanılmadığı bilgisi (README/panelde bilgilendirme için). */
export function usingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

/** Parola → deterministik oturum jetonu. */
export function sessionToken(password = adminPassword()): string {
  return crypto
    .createHmac('sha256', SIGNING_SALT)
    .update(password)
    .digest('base64url');
}

export function isValidSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = sessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyPassword(input: string): boolean {
  const expected = adminPassword();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
