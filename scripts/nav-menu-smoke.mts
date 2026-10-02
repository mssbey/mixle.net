// Üst menü duman testi (/api/admin/pages/menu).
//
// Çalışan bir sunucuya karşı: varsayılan menü, doğrulama hataları, kayıt,
// vitrinde yeni link, görüntüleyicinin yazamaması. Başta menü kaydı
// yedeklenir, sonda geri yüklenir; geçici kullanıcılar silinir.
//
// YALNIZ YEREL DB: DATABASE_URL localhost değilse çalışmaz.
// Kullanım: npx tsx scripts/nav-menu-smoke.mts [port]

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/server/auth/password';

const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error('Yalnız yerel veritabanında çalışır.');

const port = Number(process.argv[2] ?? 3000);
const base = `http://127.0.0.1:${port}`;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

let passed = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

async function api(path: string, method: string, body?: unknown, cookie?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: parsed, cookie: res.headers.getSetCookie?.() ?? [] };
}

/** `revalidateTag` isteğe bağlıdır: kayıttan sonraki ilk istek eski içeriği görebilir. */
async function fetchUntil(path: string, ok: (html: string) => boolean, tries = 5): Promise<string> {
  let html = '';
  for (let i = 0; i < tries; i += 1) {
    html = await (await fetch(base + path)).text();
    if (ok(html)) return html;
    await new Promise((r) => setTimeout(r, 500));
  }
  return html;
}

const runId = randomUUID().slice(0, 8);
const emails = { owner: `menu-sahip-${runId}@mixle.test`, viewer: `menu-gor-${runId}@mixle.test` };
const pw = `Test-${randomUUID()}`;
const backup = await db.setting.findUnique({ where: { key: 'menu-ust' } });
let cookie = '';
let original: unknown = null;

try {
  await db.user.create({ data: { email: emails.owner, passwordHash: await hashPassword(pw), name: 'Menü Sahip', role: 'sahip' } });
  await db.user.create({ data: { email: emails.viewer, passwordHash: await hashPassword(pw), name: 'Menü Gör', role: 'görüntüleyici' } });
  const login = async (email: string) =>
    (await api('/api/admin/auth', 'POST', { email, password: pw })).cookie.find((c) => c.startsWith('na_oturum='))?.split(';')[0] ?? '';
  cookie = await login(emails.owner);
  const vcookie = await login(emails.viewer);
  check('giriş', !!cookie && !!vcookie);

  const current = await api('/api/admin/pages/menu', 'GET', undefined, cookie);
  original = current.body;
  check('menü okunur', current.status === 200 && Array.isArray(current.body.links) && current.body.links.length > 0, JSON.stringify(current.body).slice(0, 200));

  const bad = await api('/api/admin/pages/menu', 'PUT', { links: [{ label: '', href: 'javascript:alert(1)' }] }, cookie);
  check('geçersiz bağlantı reddedilir', bad.status === 400 || bad.status === 422, String(bad.status));

  const label = `Test Menü ${runId}`;
  const next = { links: [...current.body.links, { label, href: '/kategori/mix-aromalar', emphasis: true }] };
  const saved = await api('/api/admin/pages/menu', 'PUT', next, cookie);
  check('kaydedilir', saved.status === 200 && saved.body.links.at(-1)?.label === label, JSON.stringify(saved.body).slice(0, 200));

  const html = await fetchUntil('/urunler', (h) => h.includes(label));
  check('vitrin header yeni linki gösterir', html.includes(label));

  const denied = await api('/api/admin/pages/menu', 'PUT', next, vcookie);
  check('görüntüleyici yazamaz', denied.status === 403, String(denied.status));
} finally {
  // Önce API ile geri yazılır ki vitrin önbelleği (revalidateTag) de temizlensin.
  if (cookie && original) await api('/api/admin/pages/menu', 'PUT', original, cookie);
  if (backup) {
    await db.setting.update({ where: { key: 'menu-ust' }, data: { value: backup.value as never, updatedByUserId: backup.updatedByUserId } });
  } else {
    await db.setting.deleteMany({ where: { key: 'menu-ust' } });
  }
  const users = await db.user.findMany({ where: { email: { in: Object.values(emails) } }, select: { id: true } });
  await db.auditLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await db.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } }).catch(() => undefined);
  await db.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  await db.$disconnect();
}

console.log(`\n${passed} geçti, ${failures.length} başarısız`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
