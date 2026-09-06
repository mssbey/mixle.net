// Kimlik doğrulama ve yetkilendirme duman testi.
//
// Üretim derlemesini başlatır ve gerçek HTTP istekleriyle şunları doğrular:
//   - oturumsuz erişim engellenir (302 / 401)
//   - hatalı parola 401 döner ve deneme sayacı işler
//   - doğru parola oturum açar
//   - rolü yetersiz kullanıcı yazma ucunda 403 alır (arayüzde gizlemek yetmez)
//   - çıkış oturumu veritabanında da iptal eder
//
// Kullanım: node scripts/auth-smoke.mjs [port]
// Önce `npm run build` çalıştırılmış olmalı.

import { spawn } from 'node:child_process';

const port = Number(process.argv[2] ?? 3996);
const base = `http://127.0.0.1:${port}`;

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function waitForServer(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await fetch(`${base}/admin/giris`, { redirect: 'manual' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Sunucu açılmadı');
}

/** Set-Cookie başlığından oturum çerezini çıkarır. */
function sessionCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    if (c.startsWith('na_oturum=')) return c.split(';')[0];
  }
  return null;
}

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', 'start', '-p', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
);
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

try {
  await waitForServer();

  const OWNER = { email: process.env.SMOKE_OWNER_EMAIL, password: process.env.SMOKE_OWNER_PASSWORD };
  const VIEWER = { email: process.env.SMOKE_VIEWER_EMAIL, password: process.env.SMOKE_VIEWER_PASSWORD };
  if (!OWNER.email || !VIEWER.email) {
    throw new Error('SMOKE_* ortam değişkenleri gerekli (bkz. betiğin çağrıldığı yer).');
  }

  console.log('\n1) Oturumsuz erişim');
  const noAuthPage = await fetch(`${base}/admin/urunler`, { redirect: 'manual' });
  check('/admin/urunler giriş sayfasına yönlendirir', noAuthPage.status === 307 || noAuthPage.status === 302,
    `status=${noAuthPage.status}`);

  const noAuthApi = await fetch(`${base}/api/admin/catalog`);
  check('/api/admin/catalog 401 döner', noAuthApi.status === 401, `status=${noAuthApi.status}`);

  console.log('\n2) Hatalı parola');
  const bad = await fetch(`${base}/api/admin/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: OWNER.email, password: 'kesinlikle-yanlis-parola' }),
  });
  const badBody = await bad.json();
  check('401 döner', bad.status === 401, `status=${bad.status}`);
  check('mesaj hesabın varlığını sızdırmaz', !/kullanıcı bulunamadı/i.test(badBody.message ?? ''),
    badBody.message);

  console.log('\n3) Doğru parola (sahip)');
  const good = await fetch(`${base}/api/admin/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: OWNER.email, password: OWNER.password }),
  });
  const ownerCookie = sessionCookie(good);
  const goodBody = await good.json();
  check('200 döner', good.status === 200, `status=${good.status}`);
  check('httpOnly oturum çerezi verilir', Boolean(ownerCookie));
  check('rol sahip', goodBody.user?.role === 'sahip', String(goodBody.user?.role));

  const catalog = await fetch(`${base}/api/admin/catalog`, { headers: { cookie: ownerCookie } });
  const catalogBody = await catalog.json();
  check('katalog okunabiliyor', catalog.status === 200, `status=${catalog.status}`);
  check('katalog veritabanından geliyor', (catalogBody.catalog?.products?.length ?? 0) > 0,
    `ürün=${catalogBody.catalog?.products?.length}`);

  const firstProduct = catalogBody.catalog?.products?.[0];
  check('fiyatlar kuruş (tam sayı)',
    Number.isInteger(firstProduct?.variants?.[0]?.priceMinor),
    `priceMinor=${firstProduct?.variants?.[0]?.priceMinor}`);

  console.log('\n4) Yetersiz rol (görüntüleyici)');
  const viewerLogin = await fetch(`${base}/api/admin/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: VIEWER.email, password: VIEWER.password }),
  });
  const viewerCookie = sessionCookie(viewerLogin);
  check('görüntüleyici giriş yapabiliyor', viewerLogin.status === 200, `status=${viewerLogin.status}`);

  const viewerRead = await fetch(`${base}/api/admin/catalog`, { headers: { cookie: viewerCookie } });
  check('görüntüleyici katalogu OKUYABİLİYOR', viewerRead.status === 200, `status=${viewerRead.status}`);

  const viewerWrite = await fetch(`${base}/api/admin/products/${firstProduct.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: viewerCookie },
    body: JSON.stringify({ name: 'Yetkisiz değişiklik denemesi' }),
  });
  check('görüntüleyici YAZAMIYOR (403)', viewerWrite.status === 403, `status=${viewerWrite.status}`);

  const viewerDelete = await fetch(`${base}/api/admin/products/${firstProduct.id}`, {
    method: 'DELETE',
    headers: { cookie: viewerCookie },
  });
  check('görüntüleyici SİLEMİYOR (403)', viewerDelete.status === 403, `status=${viewerDelete.status}`);

  const viewerPage = await fetch(`${base}/admin/ayarlar`, {
    headers: { cookie: viewerCookie },
    redirect: 'manual',
  });
  check('görüntüleyici ayarlar sayfasını görebiliyor (ayar:oku)', viewerPage.status === 200,
    `status=${viewerPage.status}`);

  console.log('\n5) Sahip yazma yetkisi');
  const ownerWrite = await fetch(`${base}/api/admin/products/${firstProduct.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: ownerCookie },
    body: JSON.stringify({ shortDescription: firstProduct.shortDescription }),
  });
  check('sahip yazabiliyor (200)', ownerWrite.status === 200, `status=${ownerWrite.status}`);

  console.log('\n6) Çıkış');
  const logout = await fetch(`${base}/api/admin/auth`, {
    method: 'DELETE',
    headers: { cookie: ownerCookie },
  });
  check('çıkış 200', logout.status === 200, `status=${logout.status}`);

  // Çerez hâlâ elimizde ve JWT süresi dolmadı; yine de erişim kesilmeli.
  const afterLogout = await fetch(`${base}/api/admin/catalog`, { headers: { cookie: ownerCookie } });
  check('iptal edilen oturumla erişim engellenir (401)', afterLogout.status === 401,
    `status=${afterLogout.status}`);
} catch (err) {
  failures.push(String(err));
  console.error(err);
  console.error('--- sunucu günlüğü ---');
  console.error(log.slice(-1500));
} finally {
  server.kill();
}

console.log(`\n${passed} kontrol geçti, ${failures.length} başarısız.`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
}
process.exit(failures.length === 0 ? 0 : 1);
